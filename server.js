const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const { verifyToken, verifyAdmin } = require('./middleware/auth');
const Certificate = require('./models/Certificate');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Handlebars setup
app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        formatDate: function(date) {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        concat: function() {
            return Array.prototype.slice.call(arguments, 0, -1).join('');
        },
        encodeURIComponent: function(string) {
            return encodeURIComponent(string);
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certificate-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.redirect('/verify');
});

// Admin routes
app.get('/admin/login', (req, res) => {
    res.render('login', { layout: 'main' });
});

app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.render('login', { 
                layout: 'main',
                error: 'Invalid credentials' 
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('login', { 
                layout: 'main',
                error: 'Invalid credentials' 
            });
        }

        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            layout: 'main',
            error: 'Server error' 
        });
    }
});

app.get('/admin/dashboard', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const certificates = await Certificate.find().sort({ createdAt: -1 }).limit(10);
        const success = req.query.success;
        const error = req.query.error;
        
        res.render('dashboard', { 
            layout: 'main',
            user: req.user,
            certificates: certificates.map(cert => cert.toObject()),
            success,
            error
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', { 
            layout: 'main',
            user: req.user,
            error: 'Server error' 
        });
    }
});

app.post('/admin/certificates/generate', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { recipientName, courseName, completionDate, certificateId } = req.body;
        
        // Validate required fields
        if (!recipientName || !courseName || !completionDate) {
            return res.redirect('/admin/dashboard?error=Please fill in all required fields');
        }

        const certificate = new Certificate({
            recipientName,
            courseName,
            completionDate,
            certificateId: certificateId || undefined, // Let the pre-save hook generate if not provided
            issuerId: req.user.userId
        });

        await certificate.save();
        res.redirect('/admin/dashboard?success=Certificate generated successfully');
    } catch (error) {
        console.error('Certificate generation error:', error);
        res.redirect('/admin/dashboard?error=Failed to generate certificate');
    }
});

app.get('/verify', async (req, res) => {
    try {
        const { id } = req.query;
        if (id) {
            const certificate = await Certificate.findOne({ certificateId: id });
            if (!certificate) {
                return res.render('verify', { 
                    layout: 'main',
                    error: 'Certificate not found' 
                });
            }
            return res.render('verify-success', { 
                layout: 'main',
                certificate: certificate.toObject()
            });
        }
        res.render('verify', { layout: 'main' });
    } catch (error) {
        console.error('Verify error:', error);
        res.render('verify', { 
            layout: 'main',
            error: 'Server error' 
        });
    }
});

app.get('/certificates/:id', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateId: req.params.id });
        if (!certificate) {
            return res.render('error', { 
                layout: 'main',
                error: 'Certificate not found' 
            });
        }

        // Generate QR code for verification URL
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify?id=${certificate.certificateId}`;
        const qrCodeUrl = await QRCode.toDataURL(verifyUrl);
        
        res.render('certificate', { 
            layout: 'main',
            certificate: certificate.toObject(),
            qrCodeUrl
        });
    } catch (error) {
        console.error('Certificate view error:', error);
        res.render('error', { 
            layout: 'main',
            error: 'Server error' 
        });
    }
});

app.get('/certificates/:id/pdf', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateId: req.params.id });
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Generate QR code for verification URL
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify?id=${certificate.certificateId}`;
        const qrCodeUrl = await QRCode.toDataURL(verifyUrl);

        // Launch Puppeteer with specific configurations
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();

        // Set viewport to match A4 landscape dimensions
        await page.setViewport({
            width: 1123,  // A4 landscape width in pixels
            height: 794,  // A4 landscape height in pixels
            deviceScaleFactor: 2
        });

        // Set content directly instead of navigating to URL
        const html = await new Promise((resolve, reject) => {
            res.render('certificate-pdf', {
                certificate: certificate.toObject(),
                qrCodeUrl, // Pass the QR code URL to the template
                layout: false,
                helpers: {
                    formatDate: (date) => {
                        return new Date(date).toLocaleDateString();
                    }
                }
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        // Set content and wait for images to load
        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        // Wait for Tailwind and images to load
        await page.waitForFunction(() => window.tailwind !== undefined);
        await page.waitForTimeout(1000);

        // Generate PDF with landscape orientation
        const pdf = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        });

        await browser.close();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateId}.pdf`);
        res.setHeader('Content-Length', pdf.length);

        // Send PDF
        res.send(pdf);
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
});

app.post('/admin/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/admin/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { verifyToken, verifyAdmin } = require('./auth');
const puppeteer = require('puppeteer');

// Generate new certificate (Admin only)
router.post('/generate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { recipientName, courseName, completionDate, certificateId } = req.body;

    const certificate = new Certificate({
      recipientName,
      courseName,
      completionDate,
      certificateId,
      issuerId: req.user.userId
    });

    await certificate.save();

    res.status(201).json(certificate);
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get certificate by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.id });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Certificate fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate PDF of certificate
router.get('/:id/pdf', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.id });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Load the certificate template URL
    await page.goto(`${process.env.FRONTEND_URL}/certificate/${certificate.certificateId}`, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateId}.pdf`);

    // Send PDF
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all certificates (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    console.error('Certificates fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 
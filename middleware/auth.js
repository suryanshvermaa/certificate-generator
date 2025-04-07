const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.redirect('/admin/login');
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin
}; 
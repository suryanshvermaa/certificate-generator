const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    recipientName: {
        type: String,
        required: true,
        trim: true
    },
    courseName: {
        type: String,
        required: true,
        trim: true
    },
    completionDate: {
        type: Date,
        required: true
    },
    certificateId: {
        type: String,
        unique: true,
        trim: true
    },
    issuerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate a unique certificate ID before saving
certificateSchema.pre('save', function(next) {
    if (!this.certificateId) {
        this.certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

module.exports = mongoose.model('Certificate', certificateSchema); 
const mongoose = require('mongoose');

const cvProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fullName: { type: String, required: true },
    headline: { type: String },
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    address: { type: String },
    dateOfBirth: { type: String },
    website: { type: String },
    summary: { type: String },
    skills: [{ type: String }],
    certifications: { type: String },

    experience: [{
        company: String,
        position: String,
        description: String,
        startDate: Date,
        endDate: Date
    }],

    education: [{
        school: String,
        major: String,
        gpa: String
    }],

    embedding: {
        type: [Number],
        default: []
    },

    isLookingForJob: {
        type: Boolean,
        default: true
    },

    isPrimary: {
        type: Boolean,
        default: false
    },

    fileUrl: { type: String },

    processingStatus: {
        type: String,
        enum: ['queued', 'processing', 'ready', 'failed'],
        default: 'queued'
    },
    processingError: { type: String },
    attempts: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('CvProfile', cvProfileSchema);
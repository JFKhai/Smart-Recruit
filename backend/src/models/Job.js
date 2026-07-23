const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    location: { type: String },

    salary: { type: String, default: '' },        
    jobType: { type: String, default: '' },         // VD: "Nhân viên chính thức", "Part-time", "Remote"
    experience: { type: String, default: '' },     
    level: { type: String, default: '' },          
    industry: { type: String, default: '' },       
    benefits: [{ type: String }],                   

    embedding: {
        type: [Number],
        default: []
    },

    expiresAt: { type: Date },
    isEmailEnabled: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['open', 'closed', 'archived'],
        default: 'open'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
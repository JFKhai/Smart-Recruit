const Application = require("../models/Application");
const Job = require("../models/Job");
const CvProfile = require("../models/CvProfile");
const aiService = require("../services/aiService");

const applyToJob = async (req, res) => {
  try {
    const { jobId, cvProfileId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: "Missing jobId" });
    }

    const job = await Job.findById(jobId);
    if (!job || job.status !== "open") {
      return res.status(404).json({ message: "Job post not found or is closed" });
    }

    let cvProfile;
    if (cvProfileId) {
      cvProfile = await CvProfile.findById(cvProfileId);
      if (!cvProfile || cvProfile.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Invalid CV profile" });
      }
    } else {
      cvProfile = await CvProfile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (!cvProfile) {
        const email = req.user.email || "candidate";
        cvProfile = await CvProfile.create({
          userId: req.user._id,
          fullName: email.split("@")[0] || "Candidate",
          summary:
            "Profile automatically created upon application (demo). Please complete your CV details in Profile & CV to generate AI matching score.",
          skills: [],
          embedding: [],
          isLookingForJob: true,
        });
      }
    }

    const existing = await Application.findOne({
      jobId,
      candidateId: req.user._id,
    });
    if (existing) {
      return res.status(400).json({ message: "You have already applied to this job" });
    }

    let matchingScore = 0;
    if (
      cvProfile.embedding &&
      cvProfile.embedding.length > 0 &&
      job.embedding &&
      job.embedding.length > 0
    ) {
      const raw = await aiService.calculateMatchingScore(cvProfile.embedding, job.embedding);
      matchingScore = Math.round(Math.min(1, Math.max(0, raw)) * 100);
    }

    const application = await Application.create({
      jobId,
      candidateId: req.user._id,
      cvProfileId: cvProfile._id,
      matchingScore,
      status: "pending",
    });

    const populated = await Application.findById(application._id).populate({
      path: "jobId",
      populate: { path: "employerId", select: "email role" },
    });

    try {
      const Notification = require('../models/Notification');
      const scoreText = matchingScore > 0 ? ` — Match score: ${matchingScore}%` : '';

      await Notification.updateMany(
        { userId: req.user._id, jobId: job._id, type: 'job_match' },
        { $set: { isDeleted: true } }
      );

      await Notification.create({
        userId: req.user._id,
        type: 'new_application',
        title: `Applied successfully: ${job.title}`,
        body: `Your job application has been submitted successfully (CV used: ${cvProfile.fullName})${scoreText}`,
        matchingScore: matchingScore || null,
        jobId: job._id,
        applicationId: application._id,
        cvProfileId: cvProfile._id
      });

      await Notification.create({
        userId: job.employerId,
        type: 'new_application',
        title: `New applicant for: ${job.title}`,
        body: `${cvProfile.fullName || req.user.email} has just applied for this position${scoreText}`,
        matchingScore: matchingScore || null,
        jobId: job._id,
        applicationId: application._id,
        candidateId: req.user._id,
        cvProfileId: cvProfile._id,
      });
    } catch (notifErr) {
      console.error('[Notification] Error creating notification:', notifErr.message);
    }

    res.status(201).json({ message: "Application submitted successfully", data: populated });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({ candidateId: req.user._id })
      .populate({
        path: "jobId",
        select: "-embedding", 
        populate: { path: "employerId", select: "email role" },
      })
      .sort({ appliedAt: -1 });

    res.json({ data: apps });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getApplicationsForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job post not found" });
    }

    if (
      job.employerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "You are not authorized to view this list" });
    }

    const apps = await Application.find({ jobId: req.params.jobId })
      .populate("candidateId", "email role")
      .populate("cvProfileId")
      .sort({ matchingScore: -1 });

    const BASE_URL = `${req.protocol}://${req.get('host')}`;
    const appsWithPdfUrl = apps.map(app => {
      const obj = app.toObject();
      if (obj.cvProfileId?.fileUrl) {
        // Point PDF download path directly to our secure controller endpoint to validate permissions (prevent IDOR)
        obj.cvProfileId.pdfUrl = `${BASE_URL}/api/cv/${obj.cvProfileId._id}/download`;
      }
      return obj;
    });

    res.json({ data: appsWithPdfUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['reviewed', 'interview', 'accepted', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
    }

    const app = await Application.findById(req.params.id).populate('jobId');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    if (
      app.jobId.employerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'You are not authorized to update this application' });
    }

    app.status = status;
    await app.save();

    res.json({ message: 'Status updated successfully', data: app });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (
      app.candidateId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "You are not authorized to cancel this application" });
    }

    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: "Application canceled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  deleteApplication,
};

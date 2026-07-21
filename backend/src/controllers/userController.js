const User = require('../models/User');
const CvProfile = require('../models/CvProfile');
const Application = require('../models/Application');

const updateMySettings = async (req, res) => {
  try {
    const { isEmailSubscribed, isLookingForJob, minMatchScore, jobMatchFrequency } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (typeof isEmailSubscribed === 'boolean') updateData.isEmailSubscribed = isEmailSubscribed;
    if (typeof minMatchScore === 'number') updateData.minMatchScore = minMatchScore;
    if (typeof jobMatchFrequency === 'string') updateData.jobMatchFrequency = jobMatchFrequency;

    if (Object.keys(updateData).length > 0) {
      await User.findByIdAndUpdate(userId, updateData);
    }

    if (typeof isLookingForJob === 'boolean') {
      const cv = await CvProfile.findOne({ userId }).sort({ createdAt: -1 });
      if (cv) {
        cv.isLookingForJob = isLookingForJob;
        await cv.save();
      }
    }

    const updatedUser = await User.findById(userId).select('-password');
    res.json({ message: 'Cập nhật cài đặt thành công', data: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const cv = await CvProfile.findOne({ userId }).sort({ createdAt: -1 });
    res.json({
      data: {
        user: {
          _id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          isEmailSubscribed: req.user.isEmailSubscribed,
          minMatchScore: req.user.minMatchScore,
          jobMatchFrequency: req.user.jobMatchFrequency,
          status: req.user.status,
        },
        cv: cv || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployerStats = async (req, res) => {
  try {
    const Job = require('../models/Job');
    const userId = req.user._id;

    const myJobs = await Job.find({ employerId: userId }).select('_id');
    const jobIds = myJobs.map((j) => j._id);

    if (jobIds.length === 0) {
      return res.json({ data: { totalApplications: 0, avgMatchScore: 0 } });
    }

    const apps = await Application.find({ jobId: { $in: jobIds } }).select('matchingScore');
    const totalApplications = apps.length;
    const avgMatchScore =
      totalApplications > 0
        ? Math.round(apps.reduce((s, a) => s + (a.matchingScore || 0), 0) / totalApplications)
        : 0;

    res.json({ data: { totalApplications, avgMatchScore } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCompanyProfile = async (req, res) => {
  try {
    const CompanyProfile = require('../models/CompanyProfile');
    const userId = req.user._id;
    let profile = await CompanyProfile.findOne({ userId });

    if (!profile) {
      profile = await CompanyProfile.create({ userId, companyName: req.user.email.split('@')[0] });
    }

    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCompanyProfile = async (req, res) => {
  try {
    const CompanyProfile = require('../models/CompanyProfile');
    const userId = req.user._id;

    const allowedFields = [
      'companyName', 'industry', 'size', 'about', 'website',
      'address', 'foundedYear', 'benefits', 'country', 'province',
      'contactName', 'phone', 'taxId'
    ];
    const updateData = {};
    allowedFields.forEach((f) => {
      if (typeof req.body[f] !== 'undefined') updateData[f] = req.body[f];
    });

    const profile = await CompanyProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Cập nhật hồ sơ công ty thành công', data: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateMySettings, getMyProfile, getEmployerStats, getCompanyProfile, updateCompanyProfile };

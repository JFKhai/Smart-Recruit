const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["candidate", "employer", "admin"],
      default: "candidate",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isEmailSubscribed: {
      type: Boolean,
      default: true,
    },
    jobMatchFrequency: {
      type: String,
      enum: ['immediately', 'daily', 'weekly'],
      default: 'daily',
    },
    minMatchScore: {
      type: Number,
      default: 70,
    },
    status: {
      type: String,
      enum: ["active", "banned"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);

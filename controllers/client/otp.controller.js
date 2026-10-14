const OTP = require("../../models/otp.model");
const nodemailer = require("nodemailer");
const User = require("../../models/user.model");
const mongoose = require("mongoose");

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD, // App password, not regular password
    }
  });
};

// Create OTP when user login
exports.otplogin = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(200).json({ status: false, message: "Email must be required." });
    }

    var newOtp = Math.floor(Math.random() * 8999) + 1000;

    const existOTP = await OTP.findOne({ email: req.body.email });

    if (existOTP) {
      existOTP.otp = newOtp;
      await existOTP.save();
    } else {
      const otp = new OTP();
      otp.email = req.body.email;
      otp.otp = newOtp;
      await otp.save();
    }

    var emailTemplate = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #333;
      }
      p {
        color: #666;
      }
      .otp {
        margin: 20px 0;
        padding: 10px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 17px
      }
      .support {
        color: #007bff;
        text-decoration: none;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <p>Please use the following One-Time Password (OTP) to complete the verification process:</p>
        <div class="otp">
          <b>OTP: ${newOtp}</b>
          <p>(Note: This OTP is valid for a limited time, so make sure to use it promptly.)</p>
        </div>
        <p>If you encounter any issues during the verification process or have any questions, feel free to reach out to our support team.</p>
      </div>
    </body>
    </html>`;

    // ✅ Use Nodemailer instead of Resend
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.appName}" <${process.env.EMAIL}>`,
      to: req.body.email,
      subject: `OTP Verification - ${process.env.appName}`,
      html: emailTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);

    return res.status(200).json({ status: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// Create OTP for password security
exports.store = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(200).json({ status: false, message: "Email must be required." });
    }

    var newOtp = Math.floor(Math.random() * 8999) + 1000;

    const userEmail = await User.findOne({ email: req.body.email });
    if (!userEmail) {
      return res.status(200).json({ status: false, message: "User does not found with that email." });
    }

    const existOTP = await OTP.findOne({ email: req.body.email });

    if (existOTP) {
      existOTP.otp = newOtp;
      await existOTP.save();
    } else {
      const otp = new OTP();
      otp.email = req.body.email;
      otp.otp = newOtp;
      await otp.save();
    }

    var emailTemplate = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #333;
      }
      p {
        color: #666;
      }
      .otp {
        margin: 20px 0;
        padding: 10px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 17px
      }
      .support {
        color: #007bff;
        text-decoration: none;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <b style="font-size: 20px">Hello </b><b style="color: green; font-size: 20px">${userEmail.fullName},</b>
        <br>
        <p>Please use the following One-Time Password (OTP) for Password Security:</p>
        <div class="otp">
          <b>OTP: ${newOtp}</b>
          <p>(Note: This OTP is valid for a limited time, so make sure to use it promptly.)</p>
        </div>
        <p>If you encounter any issues during the verification process or have any questions, feel free to reach out to our support team.</p>
      </div>
    </body>
    </html>`;

    // ✅ Use Nodemailer
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.appName}" <${process.env.EMAIL}>`,
      to: req.body.email,
      subject: `Password Reset OTP - ${process.env.appName}`,
      html: emailTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);

    return res.status(200).json({ status: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

// Verify the OTP
exports.verify = async (req, res) => {
  try {
    if (!req.body.email || !req.body.otp) {
      return res.status(200).json({ status: false, message: "OTP and email must be required!" });
    }

    const otpUser = await OTP.findOne({ email: req.body.email });
    if (!otpUser) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (parseInt(req.body.otp) === otpUser.otp) {
      await otpUser.deleteOne();
      return res.status(200).json({ status: true, message: "OTP Verified Successfully!" });
    } else {
      return res.status(200).json({ status: false, message: "OTP does not match!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

// Delete account with OTP verification or send delete account OTP
exports.deleteAccountOtp = async (req, res) => {
  try {
    const email = (req.body.email || req.query.email || "").trim();
    const userId = (req.body.userId || req.query.userId || "").trim();
    const otp = req.body.otp !== undefined ? req.body.otp : req.query.otp;

    if (!email && !userId) {
      return res.status(200).json({ status: false, message: "Email or userId must be required!" });
    }

    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && email) {
      user = await User.findOne({ email: email });
    }

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "You are blocked by the admin." });
    }

    const targetEmail = (email || user.email || "").trim();
    if (!targetEmail) {
      return res.status(200).json({ status: false, message: "User does not have a registered email address." });
    }

    // CASE 1: OTP is provided -> Verify OTP and Delete Account
    if (otp !== undefined && otp !== null && otp.toString().trim() !== "") {
      const otpRecord = await OTP.findOne({ email: targetEmail });
      if (!otpRecord) {
        return res.status(200).json({ status: false, message: "OTP not found or expired. Please request a new OTP." });
      }

      if (parseInt(otp) !== otpRecord.otp) {
        return res.status(200).json({ status: false, message: "Invalid OTP! Please try again." });
      }

      // OTP is valid! Delete OTP record
      await otpRecord.deleteOne();

      // Perform comprehensive user account deletion
      const UserController = require("./user.controller");
      if (UserController.performUserAccountDeletion) {
        await UserController.performUserAccountDeletion(user);
      } else {
        await User.deleteOne({ _id: user._id });
      }

      return res.status(200).json({
        status: true,
        message: "User account has been deleted successfully after OTP verification.",
      });
    }

    // CASE 2: OTP is not provided -> Generate and send OTP for delete account
    const newOtp = Math.floor(Math.random() * 8999) + 1000;

    const existOTP = await OTP.findOne({ email: targetEmail });
    if (existOTP) {
      existOTP.otp = newOtp;
      await existOTP.save();
    } else {
      const otpDoc = new OTP({
        email: targetEmail,
        otp: newOtp,
      });
      await otpDoc.save();
    }

    const emailTemplate = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #d9534f;
      }
      p {
        color: #555;
        line-height: 1.5;
      }
      .otp {
        margin: 20px 0;
        padding: 15px;
        background-color: #fff3f3;
        border: 1px solid #f5c6cb;
        border-radius: 5px;
        font-size: 18px;
        text-align: center;
      }
      .warning {
        color: #721c24;
        font-size: 13px;
        margin-top: 10px;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <b style="font-size: 20px">Hello </b><b style="color: #333; font-size: 20px">${user.fullName || "User"},</b>
        <br><br>
        <h2>Delete Account Verification</h2>
        <p>We received a request to permanently delete your account with <b>${process.env.appName || "LSVEM24"}</b>.</p>
        <p>Please use the following One-Time Password (OTP) to confirm the deletion of your account:</p>
        <div class="otp">
          <b>OTP: ${newOtp}</b>
          <div class="warning">
            ⚠️ Warning: Deleting your account will permanently remove your profile, videos, coins, comments, and playlists. This action cannot be undone.
          </div>
        </div>
        <p>(Note: This OTP is valid for a limited time. If you did not request account deletion, please secure your account immediately.)</p>
      </div>
    </body>
    </html>`;

    const transporter = createTransporter();
    const mailOptions = {
      from: `"${process.env.appName || "LSVEM24"}" <${process.env.EMAIL}>`,
      to: targetEmail,
      subject: `Delete Account OTP - ${process.env.appName || "LSVEM24"}`,
      html: emailTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Delete Account OTP email sent:", info.messageId);

    return res.status(200).json({
      status: true,
      message: "Email sent successfully!",
    });
  } catch (error) {
    console.error("❌ Delete Account OTP error:", error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

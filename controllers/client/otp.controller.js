const OTP = require("../../models/otp.model");
const nodemailer = require("nodemailer");
const User = require("../../models/user.model");

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

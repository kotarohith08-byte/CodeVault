const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: `"CodeVault" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "CodeVault Email Verification",
    text: `Your CodeVault verification code is: ${code}. This code will expire soon.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>CodeVault Email Verification</h2>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>Enter this code on CodeVault to verify your email address.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = sendVerificationEmail;
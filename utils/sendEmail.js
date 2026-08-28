const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(email, code) {
  console.log("Attempting to send verification email to:", email);

  try {
    const { data, error } = await resend.emails.send({
      from: "CodeVault <onboarding@resend.dev>",
      to: [email],
      subject: "CodeVault Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
          <h2>CodeVault Email Verification</h2>

          <p>Your verification code is:</p>

          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 25px 0;">
            ${code}
          </div>

          <p>Enter this code in CodeVault to verify your email address.</p>

          <p>This code will expire soon.</p>

          <p>If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      throw new Error(error.message);
    }

    console.log("Verification email sent successfully:", data.id);

    return data;
  } catch (error) {
    console.error("EMAIL SENDING ERROR:", error);
    throw error;
  }
}

module.exports = sendVerificationEmail;
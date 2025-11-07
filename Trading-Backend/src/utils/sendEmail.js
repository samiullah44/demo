//Through resend

// import { Resend } from "resend";
// import dotenv from "dotenv";
// dotenv.config();

// const resend = new Resend(process.env.RESEND_API_KEY);

// /**
//  * sendEmail - lightweight wrapper
//  * @param {string} to
//  * @param {string} subject
//  * @param {string} html
//  */
// export async function sendEmail(to, subject, html) {
//   try {
//     const response = await resend.emails.send({
//       from: "Acme <onboarding@resend.dev>"|| process.env.RESEND_FROM, // "TradePulse <onboarding@resend.dev>"
//       to,
//       subject,
//       html,
//     });
//     console.log("Email sent:", response);
//     return response;
//   } catch (error) {
//     console.error("Email send failed:", error);
//     throw new Error("Failed to send verification email");
//   }
// }

//Through nodemailer
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,             // secure SMTPS port
  secure: true,          // use TLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
  // Optional: increase timeout for slow networks
  // tls: { rejectUnauthorized: false } // only if you're forced to (not recommended)
});

export async function sendEmail({ to, subject, html, text, replyTo }) {
  try {
    const fromDisplayName = "TradePulse No-Reply";
    const fromAddress = process.env.GMAIL_USER; // the actual Gmail account
    const mailOptions = {
      from: `"${fromDisplayName}" <${fromAddress}>`, // what the recipient sees
      to,
      subject,
      html,
      text,
      // optional reply-to (if you want replies to go somewhere else)
      ...(replyTo ? { replyTo } : {}),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("sendEmail error:", err);
    throw err;
  }
}

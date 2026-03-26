/**
 * Email Service
 * Manages transactional email delivery via Nodemailer.
 * @module services/emailService
 */

const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const { ExternalServiceError } = require("../utils/errors");
const { buildMfaEmail } = require("../templates/mfaEmail");

let transporter = null;

/**
 * Lazy-loads and returns the Nodemailer transporter.
 * @returns {import("nodemailer").Transporter|null}
 */
const getTransporter = () => {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
  return transporter;
};

/**
 * Send an MFA verification code email.
 * @param {{to: string, code: string, firstName: string|null}} params
 * @returns {Promise<void>}
 */
const sendMfaCode = async ({ to, code, firstName }) => {
  const mailer = getTransporter();
  if (!mailer) {
    throw new ExternalServiceError("Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const html = buildMfaEmail({ code, firstName, expiresMinutes: env.mfaCodeTtlMinutes });

  try {
    await mailer.sendMail({
      from: env.smtpFrom,
      to,
      subject: `${code} is your Thodemy verification code`,
      html,
    });
  } catch (error) {
    throw new ExternalServiceError("Failed to send MFA email", {
      details: error?.message,
    });
  }
};

module.exports = { emailService: { sendMfaCode } };

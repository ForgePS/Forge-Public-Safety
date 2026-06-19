import nodemailer from "nodemailer";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_FROM = "Arkansas Fire Training Academy <noreply@forge-academy-95f84.web.app>";

let transporterPromise;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS ?? "",
        }
      : undefined,
  };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  const config = getSmtpConfig();
  if (!config) {
    transporterPromise = Promise.resolve(null);
    return transporterPromise;
  }

  transporterPromise = Promise.resolve(nodemailer.createTransport(config));
  return transporterPromise;
}

function normalizeRecipients(value) {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
}

/**
 * @param {{ to: string | string[], subject: string, text: string, html: string, template: string, registrationId?: string }} message
 */
export async function sendEmailMessage(message) {
  const db = getFirestore();
  const recipients = normalizeRecipients(message.to);
  if (!recipients.length) {
    return { delivered: false, reason: "no_recipients" };
  }

  const from = process.env.SMTP_FROM?.trim() || DEFAULT_FROM;
  const payload = {
    to: recipients,
    from,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
    message: {
      subject: message.subject,
      text: message.text,
      html: message.html,
    },
  };

  await db.collection("mail").add({
    ...payload,
    createdAt: new Date(),
    template: message.template,
    registrationId: message.registrationId ?? "",
  });

  const transporter = await getTransporter();
  if (transporter) {
    await transporter.sendMail({
      from,
      to: recipients.join(", "),
      replyTo: payload.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  await db.collection("emailOutbox").add({
    to: recipients,
    subject: message.subject,
    template: message.template,
    registrationId: message.registrationId ?? "",
    deliveredViaSmtp: Boolean(transporter),
    createdAt: new Date(),
  });

  return { delivered: true, viaSmtp: Boolean(transporter) };
}

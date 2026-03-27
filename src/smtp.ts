import * as nodemailer from 'nodemailer';
import type { SmtpConfig } from './config';

export interface SendOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; path: string }[];
  inReplyTo?: string;
  references?: string;
}

export function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: config.tls ? { rejectUnauthorized: true } : undefined,
  });
}

export async function sendMail(config: SmtpConfig, opts: SendOptions) {
  const transport = createTransport(config);
  try {
    const info = await transport.sendMail({
      from: opts.from,
      to: opts.to.join(', '),
      cc: opts.cc?.join(', '),
      bcc: opts.bcc?.join(', '),
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments,
      inReplyTo: opts.inReplyTo,
      references: opts.references,
    });
    return info;
  } finally {
    transport.close();
  }
}

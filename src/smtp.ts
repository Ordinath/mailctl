import * as nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MailComposer = require('nodemailer/lib/mail-composer');
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
    secure: config.tls,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: { rejectUnauthorized: true },
  });
}

function buildMailOptions(opts: SendOptions) {
  return {
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
  };
}

export async function buildRawMessage(opts: SendOptions): Promise<Buffer> {
  const composer = new MailComposer(buildMailOptions(opts));
  return composer.compile().build();
}

export interface SendResult {
  info: nodemailer.SentMessageInfo;
  raw: Buffer;
}

export async function sendMail(config: SmtpConfig, opts: SendOptions): Promise<SendResult> {
  const raw = await buildRawMessage(opts);
  const transport = createTransport(config);
  try {
    const info = await transport.sendMail({
      envelope: {
        from: opts.from,
        to: [...opts.to, ...(opts.cc || []), ...(opts.bcc || [])],
      },
      raw,
    });
    return { info, raw };
  } finally {
    transport.close();
  }
}

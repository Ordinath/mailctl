import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
}

export interface AppConfig {
  imap: ImapConfig;
  smtp: SmtpConfig;
  mailFrom: string;
  configDir: string;
}

function resolveHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

function getConfigDir(): string {
  const envDir = process.env.MAILCTL_CONFIG_DIR;
  if (envDir) {
    return resolveHome(envDir);
  }
  return path.join(os.homedir(), '.config', 'mailctl');
}

export function loadConfig(): AppConfig {
  // Load .env from config dir first (before reading env vars)
  const configDir = getConfigDir();
  const envPath = path.join(configDir, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  // Also try .env in CWD (lower priority, won't override)
  dotenv.config();

  const imap: ImapConfig = {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    tls: process.env.IMAP_TLS !== 'false',
  };

  const smtp: SmtpConfig = {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    tls: process.env.SMTP_TLS !== 'false',
  };

  const mailFrom = process.env.MAIL_FROM || smtp.user;

  return { imap, smtp, mailFrom, configDir };
}

export function requireImap(config: AppConfig): void {
  if (!config.imap.host || !config.imap.user || !config.imap.pass) {
    console.error('Error: IMAP configuration incomplete. Set IMAP_HOST, IMAP_USER, IMAP_PASS.');
    process.exit(1);
  }
}

export function requireSmtp(config: AppConfig): void {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.error('Error: SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    process.exit(1);
  }
}

export interface EmailSummary {
  uid: number;
  from: string;
  subject: string;
  date: string;
  flags: string[];
  snippet: string;
}

export interface EmailFull {
  uid: number;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  messageId: string;
  flags: string[];
  textBody: string;
  htmlBody: string;
  attachments: { filename: string; size: number; contentType: string }[];
}

export function formatInboxTable(emails: EmailSummary[]): string {
  if (emails.length === 0) {
    return 'No messages found.';
  }

  const lines: string[] = [];
  const header = `${'UID'.padEnd(8)} ${'FLAGS'.padEnd(8)} ${'DATE'.padEnd(20)} ${'FROM'.padEnd(30)} SUBJECT`;
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (const e of emails) {
    const flags = e.flags.includes('\\Seen') ? '  ' : '● ';
    const flagged = e.flags.includes('\\Flagged') ? '★' : ' ';
    const date = formatDate(e.date);
    const from = truncate(e.from, 28);
    const subject = truncate(e.subject, 60);
    lines.push(`${String(e.uid).padEnd(8)} ${(flags + flagged).padEnd(8)} ${date.padEnd(20)} ${from.padEnd(30)} ${subject}`);
  }

  lines.push(`\n${emails.length} message(s)`);
  return lines.join('\n');
}

export function formatEmailFull(email: EmailFull): string {
  const lines: string[] = [];
  lines.push(`From:    ${email.from}`);
  lines.push(`To:      ${email.to}`);
  if (email.cc) lines.push(`Cc:      ${email.cc}`);
  lines.push(`Subject: ${email.subject}`);
  lines.push(`Date:    ${email.date}`);
  lines.push(`UID:     ${email.uid}`);
  lines.push(`Flags:   ${email.flags.join(', ') || 'none'}`);

  if (email.attachments.length > 0) {
    lines.push(`\nAttachments:`);
    for (const a of email.attachments) {
      lines.push(`  - ${a.filename} (${a.contentType}, ${formatSize(a.size)})`);
    }
  }

  lines.push('\n' + '─'.repeat(60));
  lines.push(email.textBody || '(no text body)');

  return lines.join('\n');
}

export function formatFolders(folders: { name: string; path: string }[]): string {
  if (folders.length === 0) return 'No folders found.';
  const lines: string[] = [];
  for (const f of folders) {
    lines.push(`${f.path}`);
  }
  return lines.join('\n');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

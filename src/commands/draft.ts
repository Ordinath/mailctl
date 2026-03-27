import { Command } from 'commander';
import { loadConfig, requireImap, requireSmtp } from '../config';
import { withImap } from '../imap';
import { readStdin } from '../utils';

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerDraftCommand(program: Command): void {
  program
    .command('draft')
    .description('Save a draft email')
    .requiredOption('--to <address>', 'Recipient address (can be repeated)', collect, [])
    .option('--cc <address>', 'CC address (can be repeated)', collect, [])
    .option('--bcc <address>', 'BCC address (can be repeated)', collect, [])
    .requiredOption('--subject <text>', 'Email subject')
    .option('--body <text>', 'Plain text body (or pipe via stdin)')
    .option('--html <text>', 'HTML body')
    .option('--attach <filepath>', 'Attachment file path (can be repeated)', collect, [])
    .option('--from <address>', 'Override default From address')
    .action(async (opts) => {
      const config = loadConfig();
      requireImap(config);

      let body = opts.body;
      if (!body) {
        const stdin = await readStdin();
        if (stdin) {
          body = stdin;
        }
      }

      if (!body && !opts.html) {
        console.error('Error: No body provided. Use --body, --html, or pipe text via stdin.');
        process.exit(1);
      }

      const from = opts.from || config.mailFrom;
      const date = new Date().toUTCString();

      // Build raw email message for IMAP APPEND
      const lines: string[] = [];
      lines.push(`From: ${from}`);
      lines.push(`To: ${opts.to.join(', ')}`);
      if (opts.cc.length > 0) lines.push(`Cc: ${opts.cc.join(', ')}`);
      lines.push(`Subject: ${opts.subject}`);
      lines.push(`Date: ${date}`);
      lines.push(`MIME-Version: 1.0`);
      lines.push(`Content-Type: text/plain; charset=utf-8`);
      lines.push('');
      lines.push(body || '');

      const rawMessage = lines.join('\r\n');

      try {
        await withImap(config.imap, async (client) => {
          // Try common draft folder names
          const draftFolders = ['Drafts', 'INBOX.Drafts', 'Draft', '[Gmail]/Drafts'];
          let targetFolder = 'Drafts';

          const mailboxes = await client.list();
          for (const folder of draftFolders) {
            const found = mailboxes.find(
              (m) => m.path.toLowerCase() === folder.toLowerCase() ||
                     m.specialUse === '\\Drafts'
            );
            if (found) {
              targetFolder = found.path;
              break;
            }
          }

          await client.append(targetFolder, Buffer.from(rawMessage), ['\\Draft', '\\Seen']);
        });

        console.log('Draft saved.');
      } catch (err: any) {
        console.error(`Error saving draft: ${err.message}`);
        process.exit(1);
      }
    });
}

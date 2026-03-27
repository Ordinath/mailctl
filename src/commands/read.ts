import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { formatEmailFull, EmailFull } from '../formatter';
import { formatAddress } from '../utils';
import { simpleParser, ParsedMail } from 'mailparser';

export function registerReadCommand(program: Command): void {
  program
    .command('read <uid>')
    .description('Read a specific email by UID')
    .option('-j, --json', 'Output as JSON')
    .option('-r, --raw', 'Output raw email source')
    .option('-m, --mark-read', 'Mark as read after fetching')
    .action(async (uidStr: string, opts) => {
      const config = loadConfig();
      requireImap(config);
      const uid = parseInt(uidStr, 10);

      if (isNaN(uid)) {
        console.error('Error: UID must be a number.');
        process.exit(1);
      }

      try {
        const result = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          const msg = await client.fetchOne(String(uid), {
            uid: true,
            envelope: true,
            flags: true,
            source: true,
          }, { uid: true });

          if (!msg) {
            throw new Error(`Message with UID ${uid} not found.`);
          }

          if (!msg.source) {
            throw new Error(`Could not fetch source for UID ${uid}.`);
          }

          if (opts.raw) {
            return { raw: msg.source.toString() };
          }

          const parsed = await simpleParser(msg.source) as ParsedMail;

          const email: EmailFull = {
            uid: msg.uid,
            from: formatAddress(parsed.from),
            to: formatAddress(parsed.to),
            cc: formatAddress(parsed.cc),
            subject: parsed.subject || '(no subject)',
            date: parsed.date?.toISOString() || '',
            messageId: parsed.messageId || '',
            flags: Array.from(msg.flags || []),
            textBody: parsed.text || '',
            htmlBody: parsed.html || '',
            attachments: (parsed.attachments || []).map((a) => ({
              filename: a.filename || 'unnamed',
              size: a.size,
              contentType: a.contentType,
            })),
          };

          if (opts.markRead) {
            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
          }

          return { email };
        });

        if ('raw' in result) {
          console.log(result.raw);
        } else if (opts.json) {
          console.log(JSON.stringify(result.email, null, 2));
        } else {
          console.log(formatEmailFull(result.email));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

import { Command } from 'commander';
import { loadConfig, requireImap, requireSmtp } from '../config';
import { withImap } from '../imap';
import { sendMail, SendOptions } from '../smtp';
import { formatAddress, extractAddress, readStdin } from '../utils';
import { simpleParser, ParsedMail } from 'mailparser';

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerReplyCommand(program: Command): void {
  program
    .command('reply <uid>')
    .description('Reply to a specific email')
    .option('--body <text>', 'Reply body (or pipe via stdin)')
    .option('--all', 'Reply to all recipients')
    .option('--attach <filepath>', 'Attachment file path (can be repeated)', collect, [])
    .action(async (uidStr: string, opts) => {
      const config = loadConfig();
      requireImap(config);
      requireSmtp(config);
      const uid = parseInt(uidStr, 10);

      if (isNaN(uid)) {
        console.error('Error: UID must be a number.');
        process.exit(1);
      }

      let body = opts.body;
      if (!body) {
        const stdin = await readStdin();
        if (stdin) {
          body = stdin;
        }
      }

      if (!body) {
        console.error('Error: No body provided. Use --body or pipe text via stdin.');
        process.exit(1);
      }

      try {
        const original = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');
          const msg = await client.fetchOne(String(uid), {
            uid: true,
            envelope: true,
            source: true,
          }, { uid: true });

          if (!msg) {
            throw new Error(`Message with UID ${uid} not found.`);
          }

          if (!msg.source) {
            throw new Error(`Could not fetch source for UID ${uid}.`);
          }

          const parsed = await simpleParser(msg.source) as ParsedMail;
          return {
            messageId: parsed.messageId || '',
            references: parsed.references
              ? (Array.isArray(parsed.references) ? parsed.references.join(' ') : String(parsed.references))
              : '',
            from: parsed.from,
            to: parsed.to,
            cc: parsed.cc,
            subject: parsed.subject || '',
            replyTo: parsed.replyTo,
          };
        });

        const replyTo = original.replyTo
          ? formatAddress(original.replyTo)
          : formatAddress(original.from);

        const to = [extractAddress(replyTo)];
        const cc: string[] = [];

        if (opts.all) {
          const myAddr = extractAddress(config.mailFrom).toLowerCase();
          if (original.to) {
            const toAddrs = formatAddress(original.to);
            for (const addr of toAddrs.split(',').map((a: string) => a.trim())) {
              const email = extractAddress(addr).toLowerCase();
              if (email !== myAddr && !to.includes(email)) {
                cc.push(extractAddress(addr));
              }
            }
          }
          if (original.cc) {
            const ccAddrs = formatAddress(original.cc);
            for (const addr of ccAddrs.split(',').map((a: string) => a.trim())) {
              const email = extractAddress(addr).toLowerCase();
              if (email !== myAddr && !to.includes(email) && !cc.includes(email)) {
                cc.push(extractAddress(addr));
              }
            }
          }
        }

        let references = original.references || '';
        if (original.messageId) {
          references = references ? `${references} ${original.messageId}` : original.messageId;
        }

        const subject = original.subject.startsWith('Re:')
          ? original.subject
          : `Re: ${original.subject}`;

        const sendOpts: SendOptions = {
          from: config.mailFrom,
          to,
          cc: cc.length > 0 ? cc : undefined,
          subject,
          text: body,
          inReplyTo: original.messageId,
          references,
          attachments: opts.attach.map((f: string) => ({
            filename: f.split('/').pop() || f,
            path: f,
          })),
        };

        const info = await sendMail(config.smtp, sendOpts);
        console.log(`Reply sent: ${info.messageId}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

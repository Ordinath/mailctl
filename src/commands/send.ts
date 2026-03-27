import { Command } from 'commander';
import { loadConfig, requireSmtp } from '../config';
import { sendMail, SendOptions } from '../smtp';
import { readStdin } from '../utils';

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerSendCommand(program: Command): void {
  program
    .command('send')
    .description('Send an email')
    .requiredOption('--to <address>', 'Recipient address (can be repeated)', collect, [])
    .option('--cc <address>', 'CC address (can be repeated)', collect, [])
    .option('--bcc <address>', 'BCC address (can be repeated)', collect, [])
    .requiredOption('--subject <text>', 'Email subject')
    .option('--body <text>', 'Plain text body (or pipe via stdin)')
    .option('--html <text>', 'HTML body')
    .option('--attach <filepath>', 'Attachment file path (can be repeated)', collect, [])
    .option('--from <address>', 'Override default From address')
    .option('--dry-run', 'Show what would be sent without sending')
    .action(async (opts) => {
      const config = loadConfig();
      requireSmtp(config);

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

      const sendOpts: SendOptions = {
        from: opts.from || config.mailFrom,
        to: opts.to,
        cc: opts.cc.length > 0 ? opts.cc : undefined,
        bcc: opts.bcc.length > 0 ? opts.bcc : undefined,
        subject: opts.subject,
        text: body,
        html: opts.html,
        attachments: opts.attach.map((f: string) => ({
          filename: f.split('/').pop() || f,
          path: f,
        })),
      };

      if (opts.dryRun) {
        console.log('--- DRY RUN ---');
        console.log(`From:    ${sendOpts.from}`);
        console.log(`To:      ${sendOpts.to.join(', ')}`);
        if (sendOpts.cc) console.log(`Cc:      ${sendOpts.cc.join(', ')}`);
        if (sendOpts.bcc) console.log(`Bcc:     ${sendOpts.bcc.join(', ')}`);
        console.log(`Subject: ${sendOpts.subject}`);
        if (sendOpts.text) console.log(`\nBody:\n${sendOpts.text}`);
        if (sendOpts.html) console.log(`\nHTML:\n${sendOpts.html}`);
        if (sendOpts.attachments && sendOpts.attachments.length > 0) {
          console.log(`\nAttachments: ${sendOpts.attachments.map((a) => a.filename).join(', ')}`);
        }
        console.log('--- END DRY RUN ---');
        return;
      }

      try {
        const info = await sendMail(config.smtp, sendOpts);
        console.log(`Message sent: ${info.messageId}`);
      } catch (err: any) {
        console.error(`Error sending email: ${err.message}`);
        process.exit(1);
      }
    });
}

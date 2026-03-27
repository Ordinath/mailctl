import * as path from 'path';
import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { readCursor, writeCursor } from '../cursor';
import { formatInboxTable, EmailSummary } from '../formatter';
import { parseSince } from '../utils';


export function registerPollCommand(program: Command): void {
  program
    .command('poll')
    .description('Check for new emails since last poll')
    .option('-s, --since <duration>', 'Check emails from last N minutes/hours', '5m')
    .option('--cursor-file <path>', 'File to store last-seen UID')
    .option('-j, --json', 'Output as JSON')
    .action(async (opts) => {
      const config = loadConfig();
      requireImap(config);

      const cursorFile = opts.cursorFile || path.join(config.configDir, '.poll-cursor');
      const lastSeenUid = readCursor(cursorFile);

      try {
        const emails = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          let newUids: number[];

          if (lastSeenUid > 0) {
            // Cursor exists — fetch all UIDs greater than cursor, ignoring time window
            const results = await client.search({ uid: `${lastSeenUid + 1}:*` }, { uid: true }) as number[];
            newUids = results.filter((uid) => uid > lastSeenUid);
          } else {
            // No cursor yet — fall back to --since time window
            const since = parseSince(opts.since);
            const results = await client.search({ since }, { uid: true }) as number[];
            newUids = results;
          }


          if (newUids.length === 0) return [];

          newUids.sort((a, b) => b - a);

          const emails: EmailSummary[] = [];
          const range = newUids.join(',');

          for await (const msg of client.fetch(range, {
            uid: true,
            envelope: true,
            flags: true,
          }, { uid: true })) {
            const envelope = msg.envelope!;
            const fromAddr = envelope.from?.[0];
            const from = fromAddr
              ? (fromAddr.name
                ? `${fromAddr.name} <${fromAddr.address}>`
                : fromAddr.address || '')
              : '';

            emails.push({
              uid: msg.uid,
              from,
              subject: envelope.subject || '(no subject)',
              date: envelope.date?.toISOString() || '',
              flags: Array.from(msg.flags || []),
              snippet: '',
            });
          }

          emails.sort((a, b) => b.uid - a.uid);
          return emails;
        });

        // Update cursor to highest UID seen
        if (emails.length > 0) {
          const maxUid = Math.max(...emails.map((e) => e.uid));
          writeCursor(cursorFile, maxUid);
        }

        if (opts.json) {
          console.log(JSON.stringify(emails, null, 2));
        } else if (emails.length === 0) {
          console.log('No new messages.');
        } else {
          console.log(formatInboxTable(emails));
        }

        // Exit code: 0 = new messages, 1 = no new messages
        process.exit(emails.length > 0 ? 0 : 1);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(2);
      }
    });
}

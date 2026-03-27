import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { formatInboxTable, EmailSummary } from '../formatter';
import { parseSince } from '../utils';
import { simpleParser, ParsedMail } from 'mailparser';

export function registerInboxCommand(program: Command): void {
  program
    .command('inbox')
    .description('List recent emails from inbox')
    .option('-l, --limit <n>', 'Number of messages to show', '20')
    .option('-u, --unread', 'Only show unread messages')
    .option('-s, --since <date>', 'Messages since date (ISO or relative like "1h", "30m", "2d")')
    .option('-j, --json', 'Output as JSON')
    .action(async (opts) => {
      const config = loadConfig();
      requireImap(config);

      try {
        const emails = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          const searchCriteria: any = {};

          if (opts.unread) {
            searchCriteria.seen = false;
          }

          if (opts.since) {
            searchCriteria.since = parseSince(opts.since);
          }

          const hasSearch = Object.keys(searchCriteria).length > 0;
          let uids: number[];

          if (hasSearch) {
            const results = await client.search(searchCriteria, { uid: true });
            uids = results as number[];
          } else {
            // NOTE: Fetches all UIDs then slices. For very large mailboxes this
            // can be slow. A server-side SORT or sequence-based range would be
            // more efficient but not all IMAP servers support SORT.
            const results = await client.search({ all: true }, { uid: true });
            uids = results as number[];
          }

          uids.sort((a, b) => b - a);
          const limit = parseInt(opts.limit, 10) || 20;
          uids = uids.slice(0, limit);

          if (uids.length === 0) {
            return [];
          }

          const emails: EmailSummary[] = [];
          const range = uids.join(',');

          for await (const msg of client.fetch(range, {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: { maxLength: 512 },
          })) {
            const envelope = msg.envelope!;
            const fromAddr = envelope.from?.[0];
            const from = fromAddr
              ? (fromAddr.name
                ? `${fromAddr.name} <${fromAddr.address}>`
                : fromAddr.address || '')
              : '';

            let snippet = '';
            if (msg.source) {
              try {
                const parsed = await simpleParser(msg.source) as ParsedMail;
                const text = parsed.text || '';
                snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);
              } catch {
                snippet = '';
              }
            }

            emails.push({
              uid: msg.uid,
              from,
              subject: envelope.subject || '(no subject)',
              date: envelope.date?.toISOString() || '',
              flags: Array.from(msg.flags || []),
              snippet,
            });
          }

          emails.sort((a, b) => b.uid - a.uid);
          return emails;
        });

        if (opts.json) {
          console.log(JSON.stringify(emails, null, 2));
        } else {
          console.log(formatInboxTable(emails));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

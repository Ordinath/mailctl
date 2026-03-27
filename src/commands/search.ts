import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { formatInboxTable, EmailSummary } from '../formatter';
import { parseSince } from '../utils';
import { simpleParser, ParsedMail } from 'mailparser';

export function registerSearchCommand(program: Command): void {
  program
    .command('search')
    .description('Search emails')
    .option('--from <address>', 'Filter by sender')
    .option('--subject <text>', 'Filter by subject')
    .option('--body <text>', 'Filter by body text')
    .option('--since <date>', 'Messages since date')
    .option('--before <date>', 'Messages before date')
    .option('-l, --limit <n>', 'Max results', '20')
    .option('-j, --json', 'Output as JSON')
    .action(async (opts) => {
      const config = loadConfig();
      requireImap(config);

      const hasFilter = opts.from || opts.subject || opts.body || opts.since || opts.before;
      if (!hasFilter) {
        console.error('Error: Specify at least one search filter: --from, --subject, --body, --since, --before');
        process.exit(1);
      }

      try {
        const emails = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          const searchCriteria: any = {};

          if (opts.from) searchCriteria.from = opts.from;
          if (opts.subject) searchCriteria.subject = opts.subject;
          if (opts.body) searchCriteria.body = opts.body;
          if (opts.since) searchCriteria.since = parseSince(opts.since);
          if (opts.before) searchCriteria.before = parseSince(opts.before);

          const results = await client.search(searchCriteria, { uid: true }) as number[];
          if (results.length === 0) return [];

          results.sort((a, b) => b - a);
          const limit = parseInt(opts.limit, 10) || 20;
          const uids = results.slice(0, limit);

          const emails: EmailSummary[] = [];
          const range = uids.join(',');

          for await (const msg of client.fetch(range, {
            uid: true,
            envelope: true,
            flags: true,
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

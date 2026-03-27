import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { formatFolders } from '../formatter';

export function registerFoldersCommand(program: Command): void {
  program
    .command('folders')
    .description('List available IMAP folders/mailboxes')
    .option('-j, --json', 'Output as JSON')
    .action(async (opts) => {
      const config = loadConfig();
      requireImap(config);

      try {
        const folders = await withImap(config.imap, async (client) => {
          const mailboxes = await client.list();
          return mailboxes.map((m) => ({
            name: m.name,
            path: m.path,
            flags: Array.from(m.flags || []),
            specialUse: m.specialUse || '',
          }));
        });

        if (opts.json) {
          console.log(JSON.stringify(folders, null, 2));
        } else {
          console.log(formatFolders(folders));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

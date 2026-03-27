import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';

export function registerMarkCommand(program: Command): void {
  program
    .command('mark <uid>')
    .description('Mark email with flags')
    .option('--read', 'Mark as read')
    .option('--unread', 'Mark as unread')
    .option('--flagged', 'Add flagged/starred')
    .option('--unflagged', 'Remove flagged/starred')
    .option('--deleted', 'Mark for deletion')
    .action(async (uidStr: string, opts) => {
      const config = loadConfig();
      requireImap(config);
      const uid = parseInt(uidStr, 10);

      if (isNaN(uid)) {
        console.error('Error: UID must be a number.');
        process.exit(1);
      }

      const hasAction = opts.read || opts.unread || opts.flagged || opts.unflagged || opts.deleted;
      if (!hasAction) {
        console.error('Error: Specify at least one flag: --read, --unread, --flagged, --unflagged, --deleted');
        process.exit(1);
      }

      if (opts.read && opts.unread) {
        console.error('Error: --read and --unread are contradictory. Use one or the other.');
        process.exit(1);
      }
      if (opts.flagged && opts.unflagged) {
        console.error('Error: --flagged and --unflagged are contradictory. Use one or the other.');
        process.exit(1);
      }

      try {
        await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          const flagsToAdd: string[] = [];
          const flagsToRemove: string[] = [];

          if (opts.read) flagsToAdd.push('\\Seen');
          if (opts.unread) flagsToRemove.push('\\Seen');
          if (opts.flagged) flagsToAdd.push('\\Flagged');
          if (opts.unflagged) flagsToRemove.push('\\Flagged');
          if (opts.deleted) flagsToAdd.push('\\Deleted');

          if (flagsToAdd.length > 0) {
            await client.messageFlagsAdd(String(uid), flagsToAdd, { uid: true });
          }
          if (flagsToRemove.length > 0) {
            await client.messageFlagsRemove(String(uid), flagsToRemove, { uid: true });
          }
        });

        const actions: string[] = [];
        if (opts.read) actions.push('marked as read');
        if (opts.unread) actions.push('marked as unread');
        if (opts.flagged) actions.push('flagged');
        if (opts.unflagged) actions.push('unflagged');
        if (opts.deleted) actions.push('marked for deletion');
        console.log(`Message ${uid}: ${actions.join(', ')}.`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

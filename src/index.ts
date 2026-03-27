#!/usr/bin/env node

import { Command } from 'commander';
import { registerInboxCommand } from './commands/inbox';
import { registerReadCommand } from './commands/read';
import { registerSendCommand } from './commands/send';
import { registerReplyCommand } from './commands/reply';
import { registerDraftCommand } from './commands/draft';
import { registerPollCommand } from './commands/poll';
import { registerFoldersCommand } from './commands/folders';
import { registerMarkCommand } from './commands/mark';
import { registerSearchCommand } from './commands/search';

const program = new Command();

program
  .name('mailctl')
  .description('Lightweight CLI for IMAP/SMTP email operations')
  .version('1.0.0');

registerInboxCommand(program);
registerReadCommand(program);
registerSendCommand(program);
registerReplyCommand(program);
registerDraftCommand(program);
registerPollCommand(program);
registerFoldersCommand(program);
registerMarkCommand(program);
registerSearchCommand(program);

program.parse(process.argv);

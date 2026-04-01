import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'node:stream/promises';
import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { sanitizeFilename } from '../utils';
import { findAttachments, BodyStructureNode } from './attachments';

export function resolveOutputPath(dir: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const ext = path.extname(safe);
  const base = safe.slice(0, safe.length - ext.length);
  let candidate = path.join(dir, safe);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  }
  return candidate;
}

export function registerDownloadCommand(program: Command): void {
  program
    .command('download <uid> [part]')
    .description('Download attachment(s) from an email by UID')
    .option('-o, --output <dir>', 'Output directory', process.cwd())
    .option('-j, --json', 'Output as JSON')
    .action(async (uidStr: string, partArg: string | undefined, opts) => {
      const config = loadConfig();
      requireImap(config);
      const uid = parseInt(uidStr, 10);

      if (isNaN(uid)) {
        console.error('Error: UID must be a number.');
        process.exit(1);
      }

      const outputDir = path.resolve(opts.output);
      if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
        console.error(`Error: Output path is not a directory: ${outputDir}`);
        process.exit(1);
      }

      try {
        const saved = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          // Determine which parts to download
          let parts: { part: string; filename: string }[];

          if (partArg) {
            // Download specific part — need body structure for filename
            const msg = await client.fetchOne(String(uid), {
              bodyStructure: true,
            }, { uid: true });

            if (!msg) {
              throw new Error(`Message with UID ${uid} not found.`);
            }

            if (!msg.bodyStructure) {
              throw new Error(`Could not fetch body structure for UID ${uid}.`);
            }

            const attachments = findAttachments(msg.bodyStructure as unknown as BodyStructureNode);
            const match = attachments.find((a) => a.part === partArg);
            const filename = match?.filename || `part_${partArg}`;
            parts = [{ part: partArg, filename }];
          } else {
            // Download all attachments
            const msg = await client.fetchOne(String(uid), {
              bodyStructure: true,
            }, { uid: true });

            if (!msg) {
              throw new Error(`Message with UID ${uid} not found.`);
            }

            if (!msg.bodyStructure) {
              throw new Error(`Could not fetch body structure for UID ${uid}.`);
            }

            const attachments = findAttachments(msg.bodyStructure as unknown as BodyStructureNode);
            if (attachments.length === 0) {
              throw new Error(`No attachments found in message ${uid}.`);
            }

            parts = attachments.map((a) => ({ part: a.part, filename: a.filename }));
          }

          const savedFiles: { part: string; filename: string; path: string }[] = [];

          for (const { part, filename } of parts) {
            const { content } = await client.download(String(uid), part, { uid: true });
            const outPath = resolveOutputPath(outputDir, filename);
            const writeStream = fs.createWriteStream(outPath);
            try {
              await pipeline(content, writeStream);
            } catch (err) {
              // Clean up partial file
              try { fs.unlinkSync(outPath); } catch {}
              throw err;
            }
            savedFiles.push({ part, filename: path.basename(outPath), path: outPath });
          }

          return savedFiles;
        });

        if (opts.json) {
          console.log(JSON.stringify(saved, null, 2));
        } else {
          for (const f of saved) {
            console.log(`Saved: ${f.path}`);
          }
          console.log(`\n${saved.length} file(s) downloaded.`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

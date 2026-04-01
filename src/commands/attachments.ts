import { Command } from 'commander';
import { loadConfig, requireImap } from '../config';
import { withImap } from '../imap';
import { formatAttachmentsTable, AttachmentInfo } from '../formatter';

export interface BodyStructureNode {
  type?: string;
  subtype?: string;
  parameters?: Record<string, string>;
  disposition?: string;
  dispositionParameters?: Record<string, string>;
  size?: number;
  encoding?: string;
  childNodes?: BodyStructureNode[];
  part?: string;
}

export function findAttachments(node: BodyStructureNode, prefix?: string): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];

  if (node.childNodes && node.childNodes.length > 0) {
    const isMessage = node.type === 'message' && node.subtype === 'rfc822';
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      let childPart: string;
      if (isMessage) {
        // message/rfc822 wrapping: child parts continue the parent numbering
        childPart = prefix || String(i + 1);
      } else if (prefix) {
        childPart = `${prefix}.${i + 1}`;
      } else {
        childPart = String(i + 1);
      }
      attachments.push(...findAttachments(child, childPart));
    }
    return attachments;
  }

  // Leaf node
  const part = prefix || '1';
  const type = (node.type || '').toLowerCase();
  const disposition = (node.disposition || '').toLowerCase();

  const isAttachment = disposition === 'attachment' ||
    (type !== 'text' && type !== 'multipart');

  if (isAttachment) {
    const filename = node.dispositionParameters?.filename ||
      node.parameters?.name ||
      `part_${part}`;
    const contentType = node.type && node.subtype
      ? `${node.type}/${node.subtype}`
      : 'application/octet-stream';

    attachments.push({
      part,
      filename,
      contentType,
      size: node.size || 0,
    });
  }

  return attachments;
}

export function registerAttachmentsCommand(program: Command): void {
  program
    .command('attachments <uid>')
    .description('List attachments of an email by UID')
    .option('-j, --json', 'Output as JSON')
    .action(async (uidStr: string, opts) => {
      const config = loadConfig();
      requireImap(config);
      const uid = parseInt(uidStr, 10);

      if (isNaN(uid)) {
        console.error('Error: UID must be a number.');
        process.exit(1);
      }

      try {
        const attachments = await withImap(config.imap, async (client) => {
          await client.mailboxOpen('INBOX');

          const msg = await client.fetchOne(String(uid), {
            bodyStructure: true,
          }, { uid: true });

          if (!msg) {
            throw new Error(`Message with UID ${uid} not found.`);
          }

          if (!msg.bodyStructure) {
            throw new Error(`Could not fetch body structure for UID ${uid}.`);
          }

          return findAttachments(msg.bodyStructure as unknown as BodyStructureNode);
        });

        if (opts.json) {
          console.log(JSON.stringify(attachments, null, 2));
        } else {
          console.log(formatAttachmentsTable(attachments));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}

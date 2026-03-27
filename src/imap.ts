import { ImapFlow } from 'imapflow';
import type { ImapConfig } from './config';

export function createImapClient(config: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
  });
}

export async function withImap<T>(
  config: ImapConfig,
  fn: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = createImapClient(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try { await client.logout(); } catch { /* ignore logout errors */ }
  }
}

export async function appendToSent(config: ImapConfig, rawMessage: Buffer): Promise<void> {
  await withImap(config, async (client) => {
    // Find the Sent folder by special-use flag
    const folders = await client.list();
    let sentPath = 'Sent';
    for (const folder of folders) {
      if (folder.specialUse === '\\Sent') {
        sentPath = folder.path;
        break;
      }
    }
    await client.append(sentPath, rawMessage, ['\\Seen']);
  });
}

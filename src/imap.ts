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
    await client.logout();
  }
}

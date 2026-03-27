/**
 * Parse a relative duration string like "5m", "1h", "2d" into milliseconds.
 * Also accepts ISO date strings directly.
 */
export function parseSince(value: string): Date {
  // Try relative duration first
  const match = value.match(/^(\d+)\s*(m|min|h|hr|d|day|w|week)s?$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const now = Date.now();
    let ms = 0;
    switch (unit) {
      case 'm':
      case 'min':
        ms = num * 60 * 1000;
        break;
      case 'h':
      case 'hr':
        ms = num * 60 * 60 * 1000;
        break;
      case 'd':
      case 'day':
        ms = num * 24 * 60 * 60 * 1000;
        break;
      case 'w':
      case 'week':
        ms = num * 7 * 24 * 60 * 60 * 1000;
        break;
    }
    return new Date(now - ms);
  }

  // Try parsing as a date string
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/duration: "${value}". Use formats like "5m", "1h", "2d" or ISO dates.`);
  }
  return date;
}

/**
 * Read all of stdin if data is being piped.
 */
export async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Extract email address from a formatted string like "Name <email@example.com>"
 */
export function extractAddress(addr: string): string {
  const match = addr.match(/<([^>]+)>/);
  return match ? match[1] : addr;
}

/**
 * Format address object from imapflow/mailparser into a readable string.
 */
export function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (addr.text) return addr.text;
  if (Array.isArray(addr)) {
    return addr.map(formatAddress).join(', ');
  }
  if (addr.value && Array.isArray(addr.value)) {
    return addr.value.map((v: any) => {
      if (v.name) return `${v.name} <${v.address}>`;
      return v.address || '';
    }).join(', ');
  }
  if (addr.name && addr.address) return `${addr.name} <${addr.address}>`;
  if (addr.address) return addr.address;
  return String(addr);
}

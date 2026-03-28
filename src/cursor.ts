import * as fs from 'fs';
import * as path from 'path';

export function readCursor(cursorFile: string): number {
  try {
    if (fs.existsSync(cursorFile)) {
      const content = fs.readFileSync(cursorFile, 'utf-8').trim();
      const uid = parseInt(content, 10);
      return isNaN(uid) ? 0 : uid;
    }
  } catch {
    // Ignore read errors, start fresh
  }
  return 0;
}

export function writeCursor(cursorFile: string, uid: number): void {
  try {
    const dir = path.dirname(cursorFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cursorFile, String(uid), 'utf-8');
  } catch {
    // Ignore write errors (e.g., read-only filesystem) — cursor is best-effort
  }
}

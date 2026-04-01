import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveOutputPath } from '../commands/download';

describe('resolveOutputPath', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailctl-test-'));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it('returns dir/filename for normal case', () => {
    const dir = makeTmpDir();
    const result = resolveOutputPath(dir, 'report.pdf');
    expect(result).toBe(path.join(dir, 'report.pdf'));
  });

  it('appends _1 when file already exists', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'report.pdf'), '');
    const result = resolveOutputPath(dir, 'report.pdf');
    expect(result).toBe(path.join(dir, 'report_1.pdf'));
  });

  it('increments counter for multiple duplicates', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'report.pdf'), '');
    fs.writeFileSync(path.join(dir, 'report_1.pdf'), '');
    const result = resolveOutputPath(dir, 'report.pdf');
    expect(result).toBe(path.join(dir, 'report_2.pdf'));
  });

  it('sanitizes filename internally', () => {
    const dir = makeTmpDir();
    const result = resolveOutputPath(dir, '../../etc/passwd');
    expect(path.basename(result)).toBe('passwd');
    expect(path.dirname(result)).toBe(dir);
  });
});

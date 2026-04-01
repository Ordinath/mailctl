import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeFilename, parseSince } from '../utils';

describe('sanitizeFilename', () => {
  it('preserves normal filename', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
  });

  it('strips path traversal (forward slash)', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
  });

  it('strips path traversal (backslash) — sanitizes backslashes', () => {
    // On macOS, backslash is not a path separator, so path.basename keeps it
    // but the regex replaces backslashes with _
    const result = sanitizeFilename('..\\..\\etc\\passwd');
    expect(result).not.toContain('\\');
    expect(result).toContain('passwd');
  });

  it('strips null bytes', () => {
    expect(sanitizeFilename('file\x00.pdf')).toBe('file.pdf');
  });

  it('replaces dangerous characters', () => {
    const result = sanitizeFilename('bad<>:|?*.txt');
    expect(result).not.toMatch(/[<>:"|?*]/);
    expect(result).toContain('.txt');
  });

  it('returns "attachment" for empty string', () => {
    expect(sanitizeFilename('')).toBe('attachment');
  });

  it('returns "attachment" for single dot', () => {
    expect(sanitizeFilename('.')).toBe('attachment');
  });

  it('returns "attachment" for double dot', () => {
    expect(sanitizeFilename('..')).toBe('attachment');
  });

  it('truncates very long filenames preserving extension', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).toMatch(/\.pdf$/);
  });

  it('preserves unicode filename', () => {
    expect(sanitizeFilename('отчёт.pdf')).toBe('отчёт.pdf');
  });

  it('strips control characters', () => {
    const result = sanitizeFilename('file\x01\x02\x1fname.txt');
    expect(result).not.toMatch(/[\x01\x02\x1f]/);
    expect(result).toContain('file');
    expect(result).toContain('name.txt');
  });
});

describe('parseSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses "5m" as 5 minutes ago', () => {
    const result = parseSince('5m');
    const expected = new Date('2026-04-01T11:55:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('parses "1h" as 1 hour ago', () => {
    const result = parseSince('1h');
    const expected = new Date('2026-04-01T11:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('parses "2d" as 2 days ago', () => {
    const result = parseSince('2d');
    const expected = new Date('2026-03-30T12:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('parses "1w" as 1 week ago', () => {
    const result = parseSince('1w');
    const expected = new Date('2026-03-25T12:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('parses ISO date string', () => {
    const result = parseSince('2026-01-15T00:00:00Z');
    expect(result.getTime()).toBe(new Date('2026-01-15T00:00:00Z').getTime());
  });

  it('throws on invalid string', () => {
    expect(() => parseSince('abc')).toThrow('Invalid date/duration');
  });
});

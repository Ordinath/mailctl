import { describe, it, expect } from 'vitest';
import { formatAttachmentsTable, AttachmentInfo } from '../formatter';

describe('formatAttachmentsTable', () => {
  it('returns "No attachments found." for empty array', () => {
    expect(formatAttachmentsTable([])).toBe('No attachments found.');
  });

  it('formats single attachment correctly', () => {
    const attachments: AttachmentInfo[] = [{
      part: '2',
      filename: 'report.pdf',
      contentType: 'application/pdf',
      size: 50000,
    }];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('PART');
    expect(result).toContain('FILENAME');
    expect(result).toContain('TYPE');
    expect(result).toContain('SIZE');
    expect(result).toContain('report.pdf');
    expect(result).toContain('application/pdf');
    expect(result).toContain('48.8 KB');
    expect(result).toContain('1 attachment(s)');
  });

  it('formats multiple attachments with correct count', () => {
    const attachments: AttachmentInfo[] = [
      { part: '2', filename: 'a.pdf', contentType: 'application/pdf', size: 1000 },
      { part: '3', filename: 'b.png', contentType: 'image/png', size: 2000 },
      { part: '4', filename: 'c.zip', contentType: 'application/zip', size: 3000 },
    ];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('a.pdf');
    expect(result).toContain('b.png');
    expect(result).toContain('c.zip');
    expect(result).toContain('3 attachment(s)');
  });

  it('truncates long filenames with ellipsis', () => {
    const attachments: AttachmentInfo[] = [{
      part: '1',
      filename: 'a'.repeat(50) + '.pdf',
      contentType: 'application/pdf',
      size: 100,
    }];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('…');
  });

  it('formats bytes correctly', () => {
    const attachments: AttachmentInfo[] = [{
      part: '1',
      filename: 'tiny.txt',
      contentType: 'text/plain',
      size: 512,
    }];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('512 B');
  });

  it('formats KB correctly', () => {
    const attachments: AttachmentInfo[] = [{
      part: '1',
      filename: 'medium.doc',
      contentType: 'application/msword',
      size: 15360,
    }];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('15.0 KB');
  });

  it('formats MB correctly', () => {
    const attachments: AttachmentInfo[] = [{
      part: '1',
      filename: 'big.zip',
      contentType: 'application/zip',
      size: 5242880,
    }];
    const result = formatAttachmentsTable(attachments);
    expect(result).toContain('5.0 MB');
  });
});

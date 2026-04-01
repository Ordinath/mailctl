import { describe, it, expect } from 'vitest';
import { findAttachments } from '../commands/attachments';

describe('findAttachments', () => {
  it('returns empty array for text-only message', () => {
    const node = {
      type: 'text',
      subtype: 'plain',
      parameters: { charset: 'utf-8' },
      size: 1234,
    };
    expect(findAttachments(node)).toEqual([]);
  });

  it('returns single part attachment', () => {
    const node = {
      type: 'application',
      subtype: 'pdf',
      parameters: { name: 'invoice.pdf' },
      disposition: 'attachment',
      dispositionParameters: { filename: 'invoice.pdf' },
      size: 50000,
    };
    const result = findAttachments(node);
    expect(result).toEqual([{
      part: '1',
      filename: 'invoice.pdf',
      contentType: 'application/pdf',
      size: 50000,
    }]);
  });

  it('returns PDF from multipart/mixed with text + PDF', () => {
    const node = {
      type: 'multipart',
      subtype: 'mixed',
      childNodes: [
        {
          type: 'text',
          subtype: 'plain',
          parameters: { charset: 'utf-8' },
          size: 500,
        },
        {
          type: 'application',
          subtype: 'pdf',
          disposition: 'attachment',
          dispositionParameters: { filename: 'report.pdf' },
          size: 120000,
        },
      ],
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      part: '2',
      filename: 'report.pdf',
      contentType: 'application/pdf',
      size: 120000,
    });
  });

  it('handles multipart/mixed with text + multiple attachments', () => {
    const node = {
      type: 'multipart',
      subtype: 'mixed',
      childNodes: [
        {
          type: 'text',
          subtype: 'html',
          parameters: { charset: 'utf-8' },
          size: 2000,
        },
        {
          type: 'application',
          subtype: 'pdf',
          disposition: 'attachment',
          dispositionParameters: { filename: 'doc1.pdf' },
          size: 10000,
        },
        {
          type: 'image',
          subtype: 'png',
          disposition: 'attachment',
          dispositionParameters: { filename: 'screenshot.png' },
          size: 30000,
        },
      ],
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      part: '2',
      filename: 'doc1.pdf',
      contentType: 'application/pdf',
      size: 10000,
    });
    expect(result[1]).toEqual({
      part: '3',
      filename: 'screenshot.png',
      contentType: 'image/png',
      size: 30000,
    });
  });

  it('handles nested multipart (multipart/alternative + attachment)', () => {
    // multipart/mixed
    //   multipart/alternative (part 1)
    //     text/plain (part 1.1)
    //     text/html  (part 1.2)
    //   application/pdf (part 2)
    const node = {
      type: 'multipart',
      subtype: 'mixed',
      childNodes: [
        {
          type: 'multipart',
          subtype: 'alternative',
          childNodes: [
            {
              type: 'text',
              subtype: 'plain',
              parameters: { charset: 'utf-8' },
              size: 100,
            },
            {
              type: 'text',
              subtype: 'html',
              parameters: { charset: 'utf-8' },
              size: 500,
            },
          ],
        },
        {
          type: 'application',
          subtype: 'pdf',
          disposition: 'attachment',
          dispositionParameters: { filename: 'contract.pdf' },
          size: 80000,
        },
      ],
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0].part).toBe('2');
    expect(result[0].filename).toBe('contract.pdf');
  });

  it('handles message/rfc822 wrapping', () => {
    // message/rfc822 (part 1)
    //   multipart/mixed
    //     text/plain (part 1.1 — but with rfc822 logic, numbering continues)
    //     application/pdf (part 1.2)
    const node = {
      type: 'multipart',
      subtype: 'mixed',
      childNodes: [
        {
          type: 'text',
          subtype: 'plain',
          size: 200,
        },
        {
          type: 'message',
          subtype: 'rfc822',
          childNodes: [
            {
              type: 'multipart',
              subtype: 'mixed',
              childNodes: [
                {
                  type: 'text',
                  subtype: 'plain',
                  size: 100,
                },
                {
                  type: 'application',
                  subtype: 'pdf',
                  disposition: 'attachment',
                  dispositionParameters: { filename: 'forwarded.pdf' },
                  size: 5000,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('forwarded.pdf');
    expect(result[0].contentType).toBe('application/pdf');
  });

  it('includes text with disposition "attachment"', () => {
    const node = {
      type: 'text',
      subtype: 'plain',
      disposition: 'attachment',
      dispositionParameters: { filename: 'readme.txt' },
      size: 1000,
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      part: '1',
      filename: 'readme.txt',
      contentType: 'text/plain',
      size: 1000,
    });
  });

  it('includes inline image (not text, not multipart)', () => {
    const node = {
      type: 'multipart',
      subtype: 'related',
      childNodes: [
        {
          type: 'text',
          subtype: 'html',
          size: 3000,
        },
        {
          type: 'image',
          subtype: 'jpeg',
          disposition: 'inline',
          dispositionParameters: { filename: 'photo.jpg' },
          size: 25000,
        },
      ],
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('photo.jpg');
    expect(result[0].contentType).toBe('image/jpeg');
  });

  it('falls back to part_N when filename is missing', () => {
    const node = {
      type: 'application',
      subtype: 'octet-stream',
      size: 999,
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('part_1');
  });

  it('uses parameters.name when dispositionParameters.filename is missing', () => {
    const node = {
      type: 'application',
      subtype: 'zip',
      parameters: { name: 'archive.zip' },
      disposition: 'attachment',
      size: 45000,
    };
    const result = findAttachments(node);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('archive.zip');
  });
});

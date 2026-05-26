import { BadRequestException } from '@nestjs/common';
import { UploadCompressionService } from '../upload-compression.service';

jest.mock('../pdf-compressor', () => ({
  compressPdfToTarget: jest.fn(),
}));

import { compressPdfToTarget } from '../pdf-compressor';

const mockCompressPdfToTarget = compressPdfToTarget as jest.MockedFunction<
  typeof compressPdfToTarget
>;

describe('UploadCompressionService', () => {
  let service: UploadCompressionService;

  beforeEach(() => {
    service = new UploadCompressionService();
    mockCompressPdfToTarget.mockReset();
  });

  const makeFile = (
    buffer: Buffer,
    mimetype: string,
    name = 'test.bin',
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype,
      size: buffer.length,
      buffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    }) as Express.Multer.File;

  it('returns file unchanged when under target', async () => {
    const buf = Buffer.alloc(100);
    const file = makeFile(buf, 'application/pdf', 'small.pdf');
    const out = await service.prepareFile(file, 10 * 1024 * 1024, 'Test');
    expect(out.size).toBe(100);
    expect(mockCompressPdfToTarget).not.toHaveBeenCalled();
  });

  it('throws for oversized CSV', async () => {
    const buf = Buffer.alloc(11 * 1024 * 1024);
    const file = makeFile(buf, 'text/csv', 'big.csv');
    await expect(
      service.prepareFile(file, 10 * 1024 * 1024, 'CSV'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('compresses oversized PDF via qpdf-compress helper', async () => {
    const original = Buffer.alloc(15 * 1024 * 1024);
    const compressed = Buffer.alloc(4 * 1024 * 1024);
    mockCompressPdfToTarget.mockResolvedValue({
      buffer: compressed,
      wasCompressed: true,
      originalSize: original.length,
    });

    const file = makeFile(original, 'application/pdf', 'resume.pdf');
    const out = await service.prepareFile(
      file,
      5 * 1024 * 1024,
      'Resume',
    );

    expect(mockCompressPdfToTarget).toHaveBeenCalledWith(
      original,
      5 * 1024 * 1024,
    );
    expect(out.size).toBe(compressed.length);
    expect(out.mimetype).toBe('application/pdf');
    expect(out.originalname).toBe('resume.pdf');
  });

  it('throws when PDF still exceeds target after compression', async () => {
    const original = Buffer.alloc(15 * 1024 * 1024);
    mockCompressPdfToTarget.mockResolvedValue({
      buffer: Buffer.alloc(8 * 1024 * 1024),
      wasCompressed: true,
      originalSize: original.length,
    });

    const file = makeFile(original, 'application/pdf', 'big.pdf');
    await expect(
      service.prepareFile(file, 5 * 1024 * 1024, 'Resume'),
    ).rejects.toThrow(/Could not compress PDF below/);
  });
});

import { BulkResumeTempFileStore } from '../bulk-resume-temp-file.store';

describe('BulkResumeTempFileStore', () => {
  it('stores and returns entries by draft id', () => {
    const store = new BulkResumeTempFileStore();
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 120,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    store.set('draft-1', { file, fileName: 'resume.pdf' });
    const entry = store.get('draft-1');

    expect(entry).toBeTruthy();
    expect(entry?.fileName).toBe('resume.pdf');
  });

  it('deletes entries', () => {
    const store = new BulkResumeTempFileStore();
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 120,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    store.set('draft-1', { file, fileName: 'resume.pdf' });
    store.delete('draft-1');

    expect(store.get('draft-1')).toBeNull();
  });
});

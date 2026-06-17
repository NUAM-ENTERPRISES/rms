import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_META,
  getDocumentTypeRelation,
  getDocumentVariantLabel,
  getPairedDocType,
  isCopyDocType,
  isOriginalDocType,
  resolveCanonicalDocumentType,
  resolveDocumentTypeWithVariant,
} from '../document-types';

describe('document-types variant helpers', () => {
  it('identifies copy and original types', () => {
    expect(isCopyDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE)).toBe(true);
    expect(isOriginalDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE)).toBe(false);
    expect(isOriginalDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL)).toBe(
      true,
    );
    expect(isCopyDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL)).toBe(
      false,
    );
  });

  it('returns paired doc types', () => {
    expect(getPairedDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE)).toBe(
      DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL,
    );
    expect(getPairedDocType(DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL)).toBe(
      DOCUMENT_TYPE.DEGREE_CERTIFICATE,
    );
  });

  it('returns variant labels', () => {
    expect(getDocumentVariantLabel(DOCUMENT_TYPE.PASSPORT_COPY)).toBe('Copy');
    expect(getDocumentVariantLabel(DOCUMENT_TYPE.PASSPORT_ORIGINAL)).toBe(
      'Original',
    );
    expect(getDocumentVariantLabel(DOCUMENT_TYPE.RESUME)).toBeNull();
  });

  it('resolves legacy aliases as copy variants', () => {
    expect(isCopyDocType('passport')).toBe(true);
    expect(isCopyDocType('degree')).toBe(true);
    expect(getPairedDocType('degree')).toBe(
      DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL,
    );

    const resolved = resolveDocumentTypeWithVariant('passport');
    expect(resolved.resolved).toBe(DOCUMENT_TYPE.PASSPORT_COPY);
    expect(resolved.variant).toBe('copy');
    expect(resolved.pairedDocType).toBe(DOCUMENT_TYPE.PASSPORT_ORIGINAL);
  });

  it('handles original-only types without a copy pair', () => {
    expect(isOriginalDocType(DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL)).toBe(
      true,
    );
    expect(getPairedDocType(DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL)).toBeNull();
    expect(
      getDocumentTypeRelation(DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL)?.baseType,
    ).toBe('sslc_certificate');
  });

  it('links passport cover bio to passport original', () => {
    expect(getPairedDocType(DOCUMENT_TYPE.PASSPORT_COVER_BIO)).toBe(
      DOCUMENT_TYPE.PASSPORT_ORIGINAL,
    );
    expect(isCopyDocType(DOCUMENT_TYPE.PASSPORT_COVER_BIO)).toBe(true);
  });

  it('resolves duplicate legacy types to canonical catalog keys', () => {
    expect(resolveCanonicalDocumentType('police_clearance')).toBe(
      DOCUMENT_TYPE.PCC,
    );
    expect(resolveCanonicalDocumentType('photo')).toBe(
      DOCUMENT_TYPE.PASSPORT_PHOTO,
    );
    expect(resolveCanonicalDocumentType('experience_letter')).toBe(
      DOCUMENT_TYPE.EXPERIENCE_LETTERS,
    );

    const pccCanonical = resolveCanonicalDocumentType('police_clearance');
    expect(pccCanonical).toBeDefined();
    expect(DOCUMENT_TYPE_META[pccCanonical!].displayName).toBe(
      'Police Clearance (PCC)',
    );
  });
});

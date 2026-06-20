import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { COLLECTION_TYPE } from '../constants/collection-types';

describe('CreateCollectionDto', () => {
  const base = {
    candidateId: 'cand-1',
    collectedByUserId: 'user-1',
    collectedAt: '2026-06-12T10:00:00.000Z',
  };

  it('requires directOffice for direct collection', async () => {
    const dto = plainToInstance(CreateCollectionDto, {
      ...base,
      collectionType: COLLECTION_TYPE.DIRECT,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'directOffice')).toBe(true);
  });

  it('accepts recruiter collection with collectedBy only', async () => {
    const dto = plainToInstance(CreateCollectionDto, {
      ...base,
      collectionType: COLLECTION_TYPE.RECRUITER,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('requires agentId or agentNameManual for agent collection', async () => {
    const dto = plainToInstance(CreateCollectionDto, {
      ...base,
      collectionType: COLLECTION_TYPE.AGENT,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'agentNameManual')).toBe(true);
  });

  it('accepts agent collection with manual agent name', async () => {
    const dto = plainToInstance(CreateCollectionDto, {
      ...base,
      collectionType: COLLECTION_TYPE.AGENT,
      agentNameManual: 'Freelancer Agent',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

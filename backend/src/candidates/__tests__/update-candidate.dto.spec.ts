import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';

describe('UpdateCandidateDto', () => {
  it('accepts addressPincode on partial update', async () => {
    const dto = plainToInstance(UpdateCandidateDto, {
      addressPincode: '682016',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.addressPincode).toBe('682016');
  });

  it('accepts null addressPincode to clear the field', async () => {
    const dto = plainToInstance(UpdateCandidateDto, {
      addressPincode: null,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.addressPincode).toBeNull();
  });

  it('coerces numeric pincode strings from JSON', async () => {
    const dto = plainToInstance(UpdateCandidateDto, {
      addressPincode: 682016,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.addressPincode).toBe('682016');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  const mockService = {
    getMuteStatus: jest.fn(),
    setMuteStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: 'NotificationsService', useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should return settings', async () => {
    mockService.getMuteStatus.mockResolvedValue(true);
    const req = { user: { id: 'u1' } };
    const res = await controller.getSettings(req as any);
    expect(res.data.muted).toBe(true);
    expect(res.success).toBe(true);
  });

  it('should update settings', async () => {
    mockService.setMuteStatus.mockResolvedValue({ muted: false });
    const req = { user: { id: 'u1' } };
    const dto = { muted: false };
    const res = await controller.updateSettings(dto as any, req as any);
    expect(res.data.muted).toBe(false);
    expect(res.success).toBe(true);
    expect(mockService.setMuteStatus).toHaveBeenCalledWith('u1', false);
  });
});

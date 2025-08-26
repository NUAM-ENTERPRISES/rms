import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('test-db', () => {
    it('should return database connection status', async () => {
      const mockUserCount = 5;
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(mockUserCount);

      const result = await appController.testDatabase();

      expect(result).toEqual({
        success: true,
        userCount: mockUserCount,
        message: 'Database connection successful',
      });
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      jest.spyOn(prismaService.user, 'count').mockRejectedValue(mockError);

      const result = await appController.testDatabase();

      expect(result).toEqual({
        success: false,
        error: mockError.message,
        message: 'Database connection failed',
      });
    });
  });
});

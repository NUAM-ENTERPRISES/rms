import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import cookieParser from 'cookie-parser';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Set global prefix
    app.setGlobalPrefix('api/v1');

    // Add cookie parser
    app.use(cookieParser());

    // Add validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login successfully and set refresh token cookie', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@affiniks.com',
          password: 'admin123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user).toBeDefined();
          expect(res.body.data.user.roles).toContain('CEO');

          // Check if refresh token cookie is set
          const cookies = res.headers['set-cookie'];
          expect(cookies).toBeDefined();
          expect(
            Array.isArray(cookies) &&
              cookies.some((cookie: string) => cookie.includes('rft=')),
          ).toBe(true);
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@affiniks.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    it('should refresh token using cookie', async () => {
      // First login to get cookies
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@affiniks.com',
          password: 'admin123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then refresh using the cookie
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user).toBeDefined();

          // Should get new cookies
          const newCookies = res.headers['set-cookie'];
          expect(newCookies).toBeDefined();
        });
    });

    it('should reject refresh without cookie', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    it('should return user info with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@affiniks.com',
          password: 'admin123',
        });

      const accessToken = loginResponse.body.data.accessToken;

      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBeDefined();
          expect(res.body.data.roles).toContain('CEO');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    it('should logout and clear cookies', async () => {
      // First login to get token and cookies
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@affiniks.com',
          password: 'admin123',
        });

      const accessToken = loginResponse.body.data.accessToken;
      const cookies = loginResponse.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);

          // Should clear cookies
          const clearCookies = res.headers['set-cookie'];
          expect(clearCookies).toBeDefined();
          expect(
            Array.isArray(clearCookies) &&
              clearCookies.some((cookie: string) => cookie.includes('rft=;')),
          ).toBe(true);
        });
    });
  });
});

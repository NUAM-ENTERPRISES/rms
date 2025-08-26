import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

describe('RBAC System (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let adminToken: string;
  let managerToken: string;
  let recruiterToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let recruiterUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

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

    // Create test users and get tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await app.close();
  });

  async function setupTestUsers() {
    // Clean up any existing test users first
    await cleanupTestUsers();

    // Create test users
    const adminUser = await prismaService.user.create({
      data: {
        email: 'admin-test@affiniks.com',
        name: 'Admin Test',
        password: '$2b$10$test', // bcrypt hash of 'password'
      },
    });

    const managerUser = await prismaService.user.create({
      data: {
        email: 'manager-test@affiniks.com',
        name: 'Manager Test',
        password: '$2b$10$test',
      },
    });

    const recruiterUser = await prismaService.user.create({
      data: {
        email: 'recruiter-test@affiniks.com',
        name: 'Recruiter Test',
        password: '$2b$10$test',
      },
    });

    adminUserId = adminUser.id;
    managerUserId = managerUser.id;
    recruiterUserId = recruiterUser.id;

    // Get role IDs
    const ceoRole = await prismaService.role.findUnique({
      where: { name: 'CEO' },
    });
    const managerRole = await prismaService.role.findUnique({
      where: { name: 'Manager' },
    });
    const recruiterRole = await prismaService.role.findUnique({
      where: { name: 'Recruiter' },
    });

    // Assign roles
    await prismaService.userRole.create({
      data: {
        userId: adminUserId,
        roleId: ceoRole!.id,
      },
    });

    await prismaService.userRole.create({
      data: {
        userId: managerUserId,
        roleId: managerRole!.id,
      },
    });

    await prismaService.userRole.create({
      data: {
        userId: recruiterUserId,
        roleId: recruiterRole!.id,
      },
    });

    // Generate tokens
    adminToken = jwtService.sign(
      { sub: adminUserId, email: 'admin-test@affiniks.com' },
      { secret: configService.get('JWT_SECRET') },
    );

    managerToken = jwtService.sign(
      { sub: managerUserId, email: 'manager-test@affiniks.com' },
      { secret: configService.get('JWT_SECRET') },
    );

    recruiterToken = jwtService.sign(
      { sub: recruiterUserId, email: 'recruiter-test@affiniks.com' },
      { secret: configService.get('JWT_SECRET') },
    );
  }

  async function cleanupTestUsers() {
    // Clean up by email to ensure we remove existing test users
    const testEmails = [
      'admin-test@affiniks.com',
      'manager-test@affiniks.com',
      'recruiter-test@affiniks.com',
    ];

    // Find existing test users
    const existingUsers = await prismaService.user.findMany({
      where: {
        email: { in: testEmails },
      },
    });

    if (existingUsers.length > 0) {
      const userIds = existingUsers.map((user) => user.id);

      // Clean up audit logs first (due to foreign key constraint)
      await prismaService.auditLog.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      // Clean up test users
      await prismaService.userRole.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      await prismaService.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
    }
  }

  describe('/api/v1/roles (GET)', () => {
    it('should allow Manager+ to access roles list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0]).toHaveProperty('id');
          expect(res.body.data[0]).toHaveProperty('name');
          expect(res.body.data[0]).toHaveProperty('permissions');
        });
    });

    it('should allow CEO to access roles list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should deny Recruiter access to roles list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .expect(403);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    });
  });

  describe('/api/v1/roles/assign (POST)', () => {
    it('should allow Manager+ to assign roles', async () => {
      const assignRoleDto = {
        userId: recruiterUserId,
        roleId: (await prismaService.role.findUnique({
          where: { name: 'Team Lead' },
        }))!.id,
      };

      return request(app.getHttpServer())
        .post('/api/v1/roles/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignRoleDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.userId).toBe(recruiterUserId);
          expect(res.body.message).toContain('assigned');
        });
    });

    it('should deny Recruiter from assigning roles', async () => {
      const assignRoleDto = {
        userId: managerUserId,
        roleId: (await prismaService.role.findUnique({
          where: { name: 'Team Lead' },
        }))!.id,
      };

      return request(app.getHttpServer())
        .post('/api/v1/roles/assign')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(assignRoleDto)
        .expect(403);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/roles/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('/api/v1/roles/user/:userId (GET)', () => {
    it('should return user roles for Manager+', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/roles/user/${recruiterUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should deny Recruiter access to user roles', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/roles/user/${managerUserId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .expect(403);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    it('should return user information with roles and permissions', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email');
          expect(res.body.data).toHaveProperty('name');
          expect(res.body.data).toHaveProperty('roles');
          expect(res.body.data).toHaveProperty('permissions');
          expect(res.body.data.roles).toContain('CEO');
        });
    });

    it('should return manager roles and permissions', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.roles).toContain('Manager');
          expect(res.body.data.permissions).toContain('read:all');
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });
});

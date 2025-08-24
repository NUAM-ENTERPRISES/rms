import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { RbacUtil } from '../rbac.util';
import { ROLES_KEY } from '../roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let rbacUtil: RbacUtil;

  const mockRbacUtil = {
    hasRole: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RbacUtil,
          useValue: mockRbacUtil,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    rbacUtil = module.get<RbacUtil>(RbacUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-1' },
        }),
      }),
    } as unknown as ExecutionContext;

    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRbacUtil.hasRole).not.toHaveBeenCalled();
  });

  it('should allow access when user has required role', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-1' },
        }),
      }),
    } as unknown as ExecutionContext;

    mockReflector.getAllAndOverride.mockReturnValue(['Manager']);
    mockRbacUtil.hasRole.mockResolvedValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRbacUtil.hasRole).toHaveBeenCalledWith('user-1', ['Manager']);
  });

  it('should deny access when user does not have required role', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-1' },
        }),
      }),
    } as unknown as ExecutionContext;

    mockReflector.getAllAndOverride.mockReturnValue(['Manager']);
    mockRbacUtil.hasRole.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRbacUtil.hasRole).toHaveBeenCalledWith('user-1', ['Manager']);
  });

  it('should throw ForbiddenException when user is not authenticated', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    mockReflector.getAllAndOverride.mockReturnValue(['Manager']);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRbacUtil.hasRole).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when user has no id', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { email: 'test@example.com' },
        }),
      }),
    } as unknown as ExecutionContext;

    mockReflector.getAllAndOverride.mockReturnValue(['Manager']);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRbacUtil.hasRole).not.toHaveBeenCalled();
  });

  it('should include required roles in error message', async () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-1' },
        }),
      }),
    } as unknown as ExecutionContext;

    const requiredRoles = ['Manager', 'CEO'];
    mockReflector.getAllAndOverride.mockReturnValue(requiredRoles);
    mockRbacUtil.hasRole.mockResolvedValue(false);

    try {
      await guard.canActivate(context);
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toContain('Manager, CEO');
    }
  });
});

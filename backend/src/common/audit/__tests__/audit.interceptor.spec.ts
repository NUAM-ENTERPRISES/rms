import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from '../audit.interceptor';
import { AuditService } from '../audit.service';
import { SKIP_AUDIT_KEY } from '../skip-audit.decorator';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: jest.Mocked<AuditService>;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  const mockCallHandler = (data?: any, error?: any): CallHandler =>
    ({
      handle: () => (error ? throwError(() => error) : of(data)),
    }) as CallHandler;

  beforeEach(async () => {
    const mockAuditService = {
      log: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    auditService = module.get(AuditService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should skip audit for non-authenticated requests', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/users',
        body: { name: 'Test User' },
        user: null,
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler({ success: true });

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).not.toHaveBeenCalled();
          expect(result).toEqual({ success: true });
          done();
        },
      });
    });

    it('should skip audit for GET requests', (done) => {
      const request = {
        method: 'GET',
        url: '/api/v1/users',
        user: { id: 'user-123' },
        params: {},
        body: {},
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler({ data: [] });

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).not.toHaveBeenCalled();
          expect(result).toEqual({ data: [] });
          done();
        },
      });
    });

    it('should skip audit when @SkipAudit decorator is used', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/users',
        body: { name: 'Test User' },
        user: { id: 'user-123' },
        params: {},
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler({ success: true });

      reflector.getAllAndOverride.mockReturnValue(true);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).not.toHaveBeenCalled();
          expect(result).toEqual({ success: true });
          done();
        },
      });
    });

    it('should log audit for POST request (create)', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/users',
        body: { name: 'Test User', email: 'test@example.com' },
        user: { id: 'user-123' },
        params: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = {
        success: true,
        data: { id: 'new-user-456', name: 'Test User' },
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'create',
            entityId: 'new-user-456',
            entityType: 'user',
            userId: 'user-123',
            changes: {
              name: 'Test User',
              email: '[REDACTED]',
            },
            metadata: expect.objectContaining({
              method: 'POST',
              url: '/api/v1/users',
              responseStatus: 'success',
              createdId: 'new-user-456',
            }),
          });
          expect(result).toEqual(response);
          done();
        },
      });
    });

    it('should log audit for PATCH request (update)', (done) => {
      const request = {
        method: 'PATCH',
        url: '/api/v1/users/user-456',
        body: { name: 'Updated User' },
        params: { id: 'user-456' },
        user: { id: 'user-123' },
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = {
        success: true,
        data: { id: 'user-456', name: 'Updated User' },
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'update',
            entityId: 'user-456',
            entityType: 'user',
            userId: 'user-123',
            changes: {
              name: 'Updated User',
            },
            metadata: expect.objectContaining({
              method: 'PATCH',
              url: '/api/v1/users/user-456',
              responseStatus: 'success',
            }),
          });
          expect(result).toEqual(response);
          done();
        },
      });
    });

    it('should log audit for DELETE request', (done) => {
      const request = {
        method: 'DELETE',
        url: '/api/v1/users/user-456',
        params: { id: 'user-456' },
        user: { id: 'user-123' },
        body: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = { success: true };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'delete',
            entityId: 'user-456',
            entityType: 'user',
            userId: 'user-123',
            changes: {},
            metadata: expect.objectContaining({
              method: 'DELETE',
              url: '/api/v1/users/user-456',
              responseStatus: 'success',
            }),
          });
          expect(result).toEqual(response);
          done();
        },
      });
    });

    it('should log audit for client operations', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/clients',
        body: {
          name: 'Test Client',
          type: 'HEALTHCARE_ORGANIZATION',
          email: 'client@example.com',
          commissionRate: 0.15,
        },
        user: { id: 'user-123' },
        params: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = {
        success: true,
        data: { id: 'client-789', name: 'Test Client' },
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'create',
            entityId: 'client-789',
            entityType: 'client',
            userId: 'user-123',
            changes: {
              name: 'Test Client',
              type: 'HEALTHCARE_ORGANIZATION',
              email: '[REDACTED]',
              commissionRate: '[REDACTED]',
            },
            metadata: expect.objectContaining({
              method: 'POST',
              url: '/api/v1/clients',
              responseStatus: 'success',
              createdId: 'client-789',
            }),
          });
          expect(result).toEqual(response);
          done();
        },
      });
    });

    it('should log audit for candidate operations', (done) => {
      const request = {
        method: 'PATCH',
        url: '/api/v1/candidates/candidate-123',
        body: {
          currentStatus: 'shortlisted',
          expectedSalary: 50000,
        },
        params: { id: 'candidate-123' },
        user: { id: 'user-123' },
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = {
        success: true,
        data: { id: 'candidate-123', currentStatus: 'shortlisted' },
      };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'update',
            entityId: 'candidate-123',
            entityType: 'candidate',
            userId: 'user-123',
            changes: {
              currentStatus: 'shortlisted',
              expectedSalary: '[REDACTED]',
            },
            metadata: expect.objectContaining({
              method: 'PATCH',
              url: '/api/v1/candidates/candidate-123',
              responseStatus: 'success',
            }),
          });
          expect(result).toEqual(response);
          done();
        },
      });
    });

    it('should log audit for error cases', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/users',
        body: { name: 'Test User' },
        user: { id: 'user-123' },
        params: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const error = new Error('Validation failed');
      error['status'] = 400;

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(null, error);

      interceptor.intercept(context, callHandler).subscribe({
        error: (err) => {
          expect(auditService.log).toHaveBeenCalledWith({
            actionType: 'create',
            entityId: 'pending',
            entityType: 'user',
            userId: 'user-123',
            changes: {
              name: 'Test User',
            },
            metadata: expect.objectContaining({
              method: 'POST',
              url: '/api/v1/users',
              error: {
                message: 'Validation failed',
                status: 400,
              },
            }),
          });
          expect(err).toBe(error);
          done();
        },
      });
    });

    it('should handle unknown entity types gracefully', (done) => {
      const request = {
        method: 'POST',
        url: '/api/v1/unknown-endpoint',
        body: { data: 'test' },
        user: { id: 'user-123' },
        params: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
        ip: '127.0.0.1',
      };

      const response = { success: true };

      const context = mockExecutionContext(request);
      const callHandler = mockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(auditService.log).not.toHaveBeenCalled();
          expect(result).toEqual(response);
          done();
        },
      });
    });
  });
});

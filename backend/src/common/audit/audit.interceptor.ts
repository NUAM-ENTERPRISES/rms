import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { SKIP_AUDIT_KEY } from './skip-audit.decorator';

export interface AuditContext {
  entityType: string;
  entityId?: string;
  actionType: 'create' | 'update' | 'delete';
  sensitiveFields?: string[];
  skipAudit?: boolean;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;

    // Skip audit for non-authenticated requests or public endpoints
    if (!user?.id) {
      return next.handle();
    }

    const auditContext = this.extractAuditContext(request);

    // Check if audit should be skipped via decorator
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle();
    }

    // For GET requests, just pass through
    if (request.method === 'GET') {
      return next.handle();
    }

    // For mutating operations, capture before/after state
    return next.handle().pipe(
      tap((response) => {
        this.logAuditEvent(request, user.id, auditContext, response, null);
      }),
      catchError((error) => {
        this.logAuditEvent(request, user.id, auditContext, null, error);
        throw error;
      }),
    );
  }

  private extractAuditContext(request: Request): AuditContext {
    const { method, url, body, params } = request;
    const path = url.split('?')[0]; // Remove query params

    // Extract entity type from URL path
    const pathParts = path.split('/').filter(Boolean);
    const entityType = this.mapPathToEntityType(pathParts);

    // Determine action type based on HTTP method
    const actionType = this.mapMethodToActionType(method);

    // Extract entity ID from params or body
    const entityId = params.id || body?.id || this.extractIdFromPath(pathParts);

    // Define sensitive fields for different entity types
    const sensitiveFields = this.getSensitiveFields(entityType);

    return {
      entityType,
      entityId,
      actionType,
      sensitiveFields,
    };
  }

  private mapPathToEntityType(pathParts: string[]): string {
    // Map URL paths to entity types
    const entityMap: Record<string, string> = {
      users: 'user',
      clients: 'client',
      projects: 'project',
      candidates: 'candidate',
      teams: 'team',
      roles: 'role',
      documents: 'document',
      interviews: 'interview',
      processing: 'processing',
      certifications: 'certification',
      'talent-pool': 'talent_pool',
      'candidate-project-map': 'candidate_project_map',
    };

    // Find the entity type from the path
    for (const part of pathParts) {
      if (entityMap[part]) {
        return entityMap[part];
      }
    }

    // Special cases for nested resources
    if (pathParts.includes('candidates') && pathParts.includes('projects')) {
      return 'candidate_project_map';
    }

    return 'unknown';
  }

  private mapMethodToActionType(
    method: string,
  ): 'create' | 'update' | 'delete' {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PATCH':
      case 'PUT':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'update';
    }
  }

  private extractIdFromPath(pathParts: string[]): string | undefined {
    // Look for ID patterns in the path
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      // Check if this looks like an ID (cuid format or UUID)
      if (part && part.length > 10 && !isNaN(Number(part)) === false) {
        return part;
      }
    }
    return undefined;
  }

  private getSensitiveFields(entityType: string): string[] {
    const sensitiveFieldsMap: Record<string, string[]> = {
      user: ['password', 'email', 'phone', 'dateOfBirth'],
      candidate: [
        'contact',
        'email',
        'dateOfBirth',
        'expectedMinSalary',
        'expectedMaxSalary',
        'currentEmployer',
      ],
      client: ['email', 'phone', 'taxId', 'commissionRate', 'paymentTerms'],
      project: ['description', 'deadline'],
      document: ['fileUrl', 'notes'],
      interview: ['notes', 'outcome'],
      processing: ['notes'],
      certification: ['notes'],
      talent_pool: ['notes', 'currentEmployer'],
    };

    return sensitiveFieldsMap[entityType] || [];
  }

  private async logAuditEvent(
    request: Request,
    userId: string,
    auditContext: AuditContext,
    response: any,
    error: any,
  ): Promise<void> {
    try {
      const { entityType, entityId, actionType, sensitiveFields } =
        auditContext;

      // Skip audit for unknown entity types
      if (entityType === 'unknown') {
        return;
      }

      // Extract changes from request body, filtering sensitive fields
      const changes = this.extractChanges(request.body, sensitiveFields || []);

      // For updates, include the entity ID from response if not already present
      const finalEntityId = entityId || response?.data?.id || response?.id;

      if (!finalEntityId && actionType !== 'create') {
        this.logger.warn(
          `Could not determine entity ID for audit: ${request.url}`,
        );
        return;
      }

      // Prepare metadata
      const metadata: Record<string, any> = {
        method: request.method,
        url: request.url,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        timestamp: new Date().toISOString(),
      };

      // Add error information if present
      if (error) {
        metadata.error = {
          message: error.message,
          status: error.status,
        };
      }

      // Add response information for successful operations
      if (response && !error) {
        metadata.responseStatus = 'success';
        if (actionType === 'create') {
          metadata.createdId = response.data?.id || response.id;
        }
      }

      await this.auditService.log({
        actionType,
        entityId: finalEntityId || 'pending',
        entityType,
        userId,
        changes,
        metadata,
      });

      this.logger.debug(
        `Audit logged: ${actionType} ${entityType} by user ${userId}`,
      );
    } catch (auditError) {
      // Don't let audit failures break the main application
      this.logger.error('Failed to log audit event:', auditError);
    }
  }

  private extractChanges(
    body: any,
    sensitiveFields: string[],
  ): Record<string, any> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const changes: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      // Skip sensitive fields
      if (sensitiveFields.includes(key)) {
        changes[key] = '[REDACTED]';
        continue;
      }

      // Skip internal fields
      if (
        key.startsWith('_') ||
        key === 'id' ||
        key === 'createdAt' ||
        key === 'updatedAt'
      ) {
        continue;
      }

      changes[key] = value;
    }

    return changes;
  }
}

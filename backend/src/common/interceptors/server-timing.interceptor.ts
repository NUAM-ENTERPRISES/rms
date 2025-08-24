import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ServerTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Add trace ID for correlation
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    request.traceId = traceId;

    console.log(
      `[INTERCEPTOR] Starting request: ${request.method} ${request.url}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const totalTime = endTime - startTime;

          // Create Server-Timing header
          const timingParts = [
            `app_total;dur=${totalTime}`,
            `trace_id;desc="${traceId}"`,
          ];

          try {
            // Add timing header
            response.setHeader('Server-Timing', timingParts.join(', '));
            
            // Log performance metrics
            console.log(
              `[${traceId}] Request completed in ${totalTime}ms - ${request.method} ${request.url}`,
            );
            console.log(
              `[INTERCEPTOR] Headers set: ${response.getHeader('Server-Timing')}`,
            );
          } catch (error) {
            console.error(`[INTERCEPTOR] Error setting headers:`, error);
          }
        },
        error: (error) => {
          const endTime = Date.now();
          const totalTime = endTime - startTime;
          console.error(`[${traceId}] Request failed in ${totalTime}ms:`, error);
        }
      }),
    );
  }
}

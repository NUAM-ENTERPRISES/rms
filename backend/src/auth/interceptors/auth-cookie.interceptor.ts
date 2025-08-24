import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // Check if this is a login response and has refreshToken
        if (
          data?.success &&
          data?.data?.refreshToken &&
          request.url === '/api/v1/auth/login'
        ) {
          const refreshToken = data.data.refreshToken;

          // Set refresh token as httpOnly cookie
          response.cookie('rft', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });

          // Keep refreshToken in response body for frontend
          return data;
        }

        // Check if this is a refresh response
        if (
          data?.success &&
          data?.data?.refreshToken &&
          request.url === '/api/v1/auth/refresh'
        ) {
          const refreshToken = data.data.refreshToken;

          // Set new refresh token as httpOnly cookie
          response.cookie('rft', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });

          // Keep refreshToken in response body for frontend
          return data;
        }

        // Check if this is a logout response
        if (data?.success && request.url === '/api/v1/auth/logout') {
          // Clear refresh token cookie
          response.clearCookie('rft', {
            path: '/api/v1/auth',
          });
        }

        return data;
      }),
    );
  }
}

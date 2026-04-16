import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log(`[RedisIoAdapter] using Redis URL: ${redisUrl}`);
  if (redisPassword) {
    console.log('[RedisIoAdapter] using Redis password from environment');
  }

  app.useWebSocketAdapter(new RedisIoAdapter(app, redisUrl, redisPassword));

  // Security Middlewares
  app.use(helmet());
  // Trust proxy for IP-based rate limiting
  app.set('trust proxy', 1);

  // Body parser limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Global prefix
  app.setGlobalPrefix('api/v1');


  // CORS configuration with preflight optimization
  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600, // Cache preflight for 10 minutes
  });

  // Cookie parser middleware
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Affiniks RMS API')
    .setDescription('Recruitment Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Roles')
    .addTag('Projects')
    .addTag('Candidates')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
}

bootstrap();

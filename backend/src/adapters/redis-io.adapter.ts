import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';
import { Server } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient?: ReturnType<typeof createClient>;
  private subClient?: ReturnType<typeof createClient>;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl = process.env.REDIS_URL || 'redis://localhost:6379',
    private readonly redisPassword = process.env.REDIS_PASSWORD,
  ) {
    super(app);
  }

  private async createRedisClients(): Promise<void> {
    if (this.pubClient && this.subClient) {
      return;
    }

    this.logger.log(`Connecting Redis adapter to ${this.redisUrl}`);

    const clientOptions = {
      url: this.redisUrl,
      ...(this.redisPassword ? { password: this.redisPassword } : {}),
    };

    this.pubClient = createClient(clientOptions);
    this.subClient = this.pubClient.duplicate();

    const pubClient = this.pubClient;
    const subClient = this.subClient;

    pubClient.on('error', (error) => {
      this.logger.error('Redis pubClient error', error);
    });
    subClient.on('error', (error) => {
      this.logger.error('Redis subClient error', error);
    });

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.logger.log('Redis pub/sub clients connected successfully');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
      this.logger.error('Failed to connect Redis pub/sub clients', err);
      throw err;
    }
  }

  public createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);

    this.createRedisClients()
      .then(() => {
        if (!this.pubClient || !this.subClient) {
          throw new Error('Redis clients are not initialized');
        }

        server.adapter(createAdapter(this.pubClient, this.subClient));
        this.logger.log('Redis Socket.IO adapter attached to server');
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
        this.logger.error('Failed to initialize Redis adapter for Socket.IO', err);
      });

    return server;
  }
}

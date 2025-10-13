import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(
          `Connection rejected: No token provided for socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (!payload || !payload.sub) {
        this.logger.warn(
          `Connection rejected: Invalid token for socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      // Join user to their personal room
      await client.join(`user:${userId}`);

      // Track connected user
      this.connectedUsers.set(client.id, userId);

      this.logger.log(`User ${userId} connected via socket ${client.id}`);

      // Send connection confirmation
      client.emit('connected', { userId, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Connection error for socket ${client.id}: ${error.message}`,
        error.stack,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);

    if (userId) {
      this.logger.log(`User ${userId} disconnected from socket ${client.id}`);
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit('pong', { timestamp: new Date().toISOString(), ...data });
  }

  /**
   * Emit notification to a specific user
   */
  async emitToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit(event, data);
      this.logger.debug(`Emitted ${event} to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit to user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit notification to multiple users
   */
  async emitToUsers(
    userIds: string[],
    event: string,
    data: any,
  ): Promise<void> {
    try {
      for (const userId of userIds) {
        await this.emitToUser(userId, event, data);
      }
    } catch (error) {
      this.logger.error(
        `Failed to emit to users: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).includes(userId);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const token = client.handshake.query.token as string;
    if (token) {
      return token;
    }

    // Try to get token from cookies
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const tokenMatch = cookies.match(/accessToken=([^;]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }

    return null;
  }
}

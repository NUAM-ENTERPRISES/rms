import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UserAccountStatus } from '@prisma/client';
import { buildCorsOriginAllowlist } from '../common/cors.util';

@WebSocketGateway({
  cors: {
    origin: buildCorsOriginAllowlist(),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  /** Roles that should join the 'admins' socket room for session monitoring events */
  private static readonly ADMIN_ROLES = new Set([
    'CEO', 'Manager',  'System Admin',
  ]);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

      const accountUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountStatus: true },
      });

      if (accountUser?.accountStatus === UserAccountStatus.BLOCKED) {
        this.logger.warn(
          `Connection rejected: blocked account for user ${userId}`,
        );
        client.disconnect();
        return;
      }

      // Join user to their personal room
      await client.join(`user:${userId}`);

      // Join admin room if user has an admin role (for session monitoring events)
      try {
        const userRoles = await this.prisma.userRole.findMany({
          where: { userId },
          select: { role: { select: { name: true } } },
        });
        const roleNames = userRoles.map((ur: any) => ur.role?.name).filter(Boolean);
        const isAdmin = roleNames.some((name: string) =>
          NotificationsGateway.ADMIN_ROLES.has(name),
        );
        if (isAdmin) {
          await client.join('admins');
          this.logger.debug(`User ${userId} joined admin room (roles: ${roleNames.join(', ')})`);
        }
      } catch (roleError: any) {
        this.logger.warn(`Could not determine admin roles for user ${userId}: ${(roleError as any)?.message ?? roleError}`);
      }

      // Track connected user
      this.connectedUsers.set(client.id, userId);

      this.logger.log(`User ${userId} connected via socket ${client.id}`);

      // Send connection confirmation
      client.emit('connected', { userId, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      this.logger.error(
        `Connection error for socket ${client.id}: ${(error as any)?.message ?? error}`,
        (error as any)?.stack,
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
    } catch (error: unknown) {
      this.logger.error(
        `Failed to emit to user ${userId}: ${(error as any)?.message ?? error}`,
        (error as any)?.stack,
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
    } catch (error: unknown) {
      this.logger.error(
        `Failed to emit to users: ${(error as any)?.message ?? error}`,
        (error as any)?.stack,
      );
    }
  }

  /**
   * Broadcast an event to all connected users
   */
  async broadcastEvent(event: string, data: any): Promise<void> {
    try {
      this.server.emit(event, data);
      this.logger.debug(`Broadcasting ${event} to all users`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to broadcast event ${event}: ${(error as any)?.message ?? error}`,
        (error as any)?.stack,
      );
    }
  }

  /**
   * Emit an event only to connected users in the 'admins' room.
   * Use this for session monitoring events to avoid unnecessary traffic for normal users.
   */
  async broadcastToAdmins(event: string, data: any): Promise<void> {
    try {
      this.server.to('admins').emit(event, data);
      this.logger.debug(`Emitted ${event} to admins room`);
    } catch (error: any) {
      this.logger.error(
        `Failed to emit ${event} to admins: ${(error as any)?.message ?? error}`,
        (error as any)?.stack,
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
    // Try to get token from the Socket.IO auth payload first
    const authToken = client.handshake.auth?.token as string;
    if (authToken) {
      return authToken;
    }

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

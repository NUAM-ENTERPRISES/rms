import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto, CreateClientSubClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { ClientType } from '@prisma/client';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Permissions('manage:clients')
  @ApiOperation({
    summary: 'Create a new client',
    description:
      'Create a new client with type-specific information and optional financial tracking.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'client123' },
            name: { type: 'string', example: 'City General Hospital' },
            type: { type: 'string', example: 'DIRECT_CLIENT' },
            // ... other client properties
          },
        },
        message: { type: 'string', example: 'Client created successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(@Body() createClientDto: CreateClientDto, @Request() req) {
    return this.clientsService.create(createClientDto, req.user.id);
  }

  @Post(':parentClientId/sub-clients')
  @Permissions('manage:clients')
  @ApiOperation({
    summary: 'Create and link an end-client to a Sub Agent / Freelance client',
    description:
      'Creates a client row and attaches it via client_sub_clients. Parent must be SUB_AGENT or FREELANCE.',
  })
  @ApiParam({
    name: 'parentClientId',
    description: 'Parent intermediary client ID',
    example: 'cl_parent',
  })
  @ApiResponse({ status: 201, description: 'Parent client with updated links' })
  @ApiResponse({ status: 400, description: 'Invalid parent type or duplicate link' })
  @ApiResponse({ status: 404, description: 'Parent client not found' })
  async linkSubClient(
    @Param('parentClientId') parentClientId: string,
    @Body() body: CreateClientSubClientDto,
    @Request() req,
  ) {
    return this.clientsService.linkSubClient(
      parentClientId,
      body,
      req.user.id,
    );
  }

  @Get()
  @Permissions('read:clients')
  @ApiOperation({
    summary: 'Get all clients with pagination and filtering',
    description:
      'Retrieve a paginated list of clients with optional search and type filtering.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by client type',
    enum: ClientType,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for name, email, or organization',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            clients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  // ... other properties
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' },
              },
            },
            totals: {
              type: 'object',
              properties: {
                totalClients: { type: 'number', example: 120 },
                directClients: { type: 'number', example: 75 },
                subAgencyClients: { type: 'number', example: 25 },
                freelanceClients: { type: 'number', example: 20 },
              },
            },
          },
        },
        message: { type: 'string', example: 'Clients retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@Query() query: QueryClientsDto) {
    return this.clientsService.findAll(query);
  }

  @Get('stats')
  @Permissions('read:clients')
  @ApiOperation({
    summary: 'Get client statistics',
    description:
      'Retrieve statistics about clients by type and active projects.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalClients: { type: 'number', example: 150 },
            activeProjects: { type: 'number', example: 25 },
            byType: {
              type: 'object',
              properties: {
                DIRECT_CLIENT: { type: 'number', example: 45 },
                SUB_AGENT: { type: 'number', example: 30 },
                FREELANCE: { type: 'number', example: 15 },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Client statistics retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats() {
    return this.clientsService.getClientStats();
  }

  @Get(':id')
  @Permissions('read:clients')
  @ApiOperation({
    summary: 'Get client by ID',
    description:
      'Retrieve a specific client with all their projects and related data.',
  })
  @ApiParam({ name: 'id', description: 'Client ID', example: 'client123' })
  @ApiResponse({
    status: 200,
    description: 'Client retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  status: { type: 'string' },
                  // ... other project properties
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Client retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Client not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('manage:clients')
  @ApiOperation({
    summary: 'Update client',
    description:
      'Update a client with new information. All fields are optional for partial updates.',
  })
  @ApiParam({ name: 'id', description: 'Client ID', example: 'client123' })
  @ApiResponse({
    status: 200,
    description: 'Client updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            // ... other updated properties
          },
        },
        message: { type: 'string', example: 'Client updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - Client not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Request() req,
  ) {
    return this.clientsService.update(id, updateClientDto, req.user.id);
  }

  @Delete(':id')
  @Permissions('manage:clients')
  @ApiOperation({
    summary: 'Delete client',
    description: 'Delete a client. Cannot delete clients with active projects.',
  })
  @ApiParam({ name: 'id', description: 'Client ID', example: 'client123' })
  @ApiResponse({
    status: 200,
    description: 'Client deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        message: { type: 'string', example: 'Client deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Client has active projects',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Client not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.id);
  }
}

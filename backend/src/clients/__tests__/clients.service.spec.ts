import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ClientSubClientLinkType,
  ClientType,
} from '@prisma/client';
import { ClientsService } from '../clients.service';
import type { CreateClientDto } from '../dto/create-client.dto';

describe('ClientsService', () => {
  let service: ClientsService;

  let prismaCountryFindUnique: jest.Mock;
  let prismaStateFindUnique: jest.Mock;
  let prismaTransaction: jest.Mock;
  let txClientCreate: jest.Mock;
  let txClientFindUniqueOrThrow: jest.Mock;
  let txClientSubClientCreate: jest.Mock;

  beforeEach(() => {
    prismaCountryFindUnique = jest.fn();
    prismaStateFindUnique = jest.fn();
    prismaTransaction = jest.fn();

    txClientCreate = jest.fn();
    txClientFindUniqueOrThrow = jest.fn();
    txClientSubClientCreate = jest.fn();

    const prisma = {
      $transaction: prismaTransaction,
      country: { findUnique: prismaCountryFindUnique },
      state: { findUnique: prismaStateFindUnique },
    };

    prismaCountryFindUnique.mockResolvedValue(null);
    prismaStateFindUnique.mockResolvedValue(null);

    service = new ClientsService(prisma as any);
  });

  describe('create', () => {
    const parentIncluded = {
      id: 'parent-1',
      name: 'Parent',
      type: ClientType.DIRECT_CLIENT,
      projects: [],
      subClientLinks: [],
      parentClientLinks: [],
    };

    it('creates DIRECT_CLIENT without subClient', async () => {
      txClientCreate.mockResolvedValueOnce(parentIncluded);
      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      const dto: CreateClientDto = {
        name: 'Acme',
        type: ClientType.DIRECT_CLIENT,
      };

      const result = await service.create(dto, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('parent-1');
      expect(txClientSubClientCreate).not.toHaveBeenCalled();
      expect(txClientCreate).toHaveBeenCalledTimes(1);
    });

    it('throws when DIRECT_CLIENT includes subClient', async () => {
      const dto: CreateClientDto = {
        name: 'Acme',
        type: ClientType.DIRECT_CLIENT,
        subClient: { name: 'Child' },
      };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('creates SUB_AGENT without linked sub-client when subClient omitted', async () => {
      txClientCreate.mockResolvedValueOnce(parentIncluded);
      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      const dto: CreateClientDto = {
        name: 'Agent Parent',
        type: ClientType.SUB_AGENT,
      };

      const result = await service.create(dto, 'user-1');

      expect(result.success).toBe(true);
      expect(txClientCreate).toHaveBeenCalledTimes(1);
      expect(txClientSubClientCreate).not.toHaveBeenCalled();
    });

    it('creates SUB_AGENT with linked child using chosen sub-client type', async () => {
      const parentRow = {
        id: 'parent-1',
        name: 'Agency',
        type: ClientType.SUB_AGENT,
        projects: [],
        subClientLinks: [],
        parentClientLinks: [],
      };
      const childRow = {
        id: 'child-1',
        name: 'End Org',
        type: ClientType.FREELANCE,
      };
      const refetched = {
        ...parentRow,
        subClientLinks: [
          {
            linkType: ClientSubClientLinkType.SUB_AGENT,
            child: childRow,
          },
        ],
      };

      txClientCreate
        .mockResolvedValueOnce(parentRow)
        .mockResolvedValueOnce(childRow);
      txClientFindUniqueOrThrow.mockResolvedValueOnce(refetched);

      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      await service.create(
        {
          name: 'Agency',
          type: ClientType.SUB_AGENT,
          subClient: { name: 'End Org', type: ClientType.FREELANCE },
        },
        'user-1',
      );

      expect(txClientCreate.mock.calls[1][0].data.type).toBe(
        ClientType.FREELANCE,
      );
    });

    it('creates SUB_AGENT with child and junction row', async () => {
      const parentRow = {
        id: 'parent-1',
        name: 'Abhijith',
        type: ClientType.SUB_AGENT,
        projects: [],
        subClientLinks: [],
        parentClientLinks: [],
      };
      const childRow = {
        id: 'child-1',
        name: 'Emirates',
        type: ClientType.DIRECT_CLIENT,
      };
      const refetched = {
        ...parentRow,
        subClientLinks: [
          {
            linkType: ClientSubClientLinkType.SUB_AGENT,
            child: childRow,
          },
        ],
      };

      txClientCreate
        .mockResolvedValueOnce(parentRow)
        .mockResolvedValueOnce(childRow);
      txClientFindUniqueOrThrow.mockResolvedValueOnce(refetched);

      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      const dto: CreateClientDto = {
        name: 'Abhijith',
        type: ClientType.SUB_AGENT,
        subClient: { name: 'Emirates', email: 'ops@emirates.example' },
      };

      const result = await service.create(dto, 'user-1');

      expect(result.success).toBe(true);
      expect(txClientCreate).toHaveBeenCalledTimes(2);
      expect(txClientSubClientCreate).toHaveBeenCalledWith({
        data: {
          parentClientId: 'parent-1',
          childClientId: 'child-1',
          linkType: ClientSubClientLinkType.SUB_AGENT,
        },
      });
      expect(result.data).toEqual(refetched);
    });

    it('uses FREELANCE link type for FREELANCE parent', async () => {
      const parentRow = {
        id: 'p-f',
        name: 'Freelancer',
        type: ClientType.FREELANCE,
        projects: [],
        subClientLinks: [],
        parentClientLinks: [],
      };
      const childRow = {
        id: 'c-f',
        name: 'End Co',
        type: ClientType.DIRECT_CLIENT,
      };

      txClientCreate
        .mockResolvedValueOnce(parentRow)
        .mockResolvedValueOnce(childRow);
      txClientFindUniqueOrThrow.mockResolvedValueOnce({
        ...parentRow,
        subClientLinks: [{ child: childRow }],
      });

      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      await service.create(
        {
          name: 'Freelancer',
          type: ClientType.FREELANCE,
          subClient: { name: 'End Co' },
        },
        'user-1',
      );

      expect(txClientSubClientCreate).toHaveBeenCalledWith({
        data: {
          parentClientId: 'p-f',
          childClientId: 'c-f',
          linkType: ClientSubClientLinkType.FREELANCE,
        },
      });
    });
  });

  describe('linkSubClient', () => {
    it('throws when parent client is DIRECT_CLIENT', async () => {
      const prisma = {
        client: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'p', type: ClientType.DIRECT_CLIENT }),
        },
      };
      const svc = new ClientsService(prisma as never);
      await expect(
        svc.linkSubClient('p', { name: 'Child' }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when parent not found', async () => {
      const prisma = {
        client: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const svc = new ClientsService(prisma as never);
      await expect(
        svc.linkSubClient('missing', { name: 'Child' }, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies requested client type when linking sub-client', async () => {
      const prisma = {
        client: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p',
            type: ClientType.SUB_AGENT,
          }),
        },
        $transaction: prismaTransaction,
      };
      txClientCreate.mockResolvedValueOnce({
        id: 'child-new',
        name: 'Kid',
        type: ClientType.SUB_AGENT,
      });
      txClientFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'p',
        type: ClientType.SUB_AGENT,
        subClientLinks: [],
        projects: [],
        parentClientLinks: [],
      });
      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );
      const svc = new ClientsService(prisma as never);

      await svc.linkSubClient(
        'p',
        { name: 'Kid', type: ClientType.SUB_AGENT },
        'u1',
      );

      expect(txClientCreate.mock.calls[0][0].data.type).toBe(
        ClientType.SUB_AGENT,
      );
    });

    it('creates child and junction for SUB_AGENT parent', async () => {
      const prismaFindUnique = jest.fn().mockResolvedValue({
        id: 'parent-1',
        type: ClientType.SUB_AGENT,
      });
      txClientCreate.mockResolvedValueOnce({
        id: 'child-new',
        name: 'New End',
        type: ClientType.DIRECT_CLIENT,
      });
      txClientFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'parent-1',
        name: 'Agent',
        type: ClientType.SUB_AGENT,
        subClientLinks: [],
        projects: [],
        parentClientLinks: [],
      });

      prismaTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          client: {
            create: txClientCreate,
            findUniqueOrThrow: txClientFindUniqueOrThrow,
          },
          clientSubClient: { create: txClientSubClientCreate },
        }),
      );

      const prisma = {
        $transaction: prismaTransaction,
        client: { findUnique: prismaFindUnique },
      };
      const svc = new ClientsService(prisma as never);

      await svc.linkSubClient(
        'parent-1',
        { name: 'New End', type: ClientType.DIRECT_CLIENT },
        'u1',
      );

      expect(txClientCreate.mock.calls[0][0].data.type).toBe(
        ClientType.DIRECT_CLIENT,
      );
      expect(txClientSubClientCreate).toHaveBeenCalledWith({
        data: {
          parentClientId: 'parent-1',
          childClientId: 'child-new',
          linkType: ClientSubClientLinkType.SUB_AGENT,
        },
      });
    });
  });
});

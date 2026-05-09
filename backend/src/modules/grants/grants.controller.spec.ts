import { Test, TestingModule } from '@nestjs/testing';
import { GrantsController } from './grants.controller';
import { GrantsService } from './grants.service';

describe('GrantsController', () => {
  let controller: GrantsController;
  let service: GrantsService;

  const mockGrantsService = {
    findAll: jest.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Test Grant' }],
      total: 1,
      page: 1,
      per_page: 20,
    }),
    findOne: jest.fn().mockResolvedValue({ id: '1', name: 'Test Grant' }),
  };

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [GrantsController],
      providers: [
        {
          provide: GrantsService,
          useValue: mockGrantsService,
        },
      ],
    }).compile();

    controller = testingModule.get<GrantsController>(GrantsController);
    service = testingModule.get<GrantsService>(GrantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of grants', async () => {
      const result = await controller.findAll({ page: '1' });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith({ page: '1' });
    });
  });

  describe('findOne', () => {
    it('should return a single grant', async () => {
      const result = await controller.findOne('1');
      expect(result.name).toBe('Test Grant');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });
});

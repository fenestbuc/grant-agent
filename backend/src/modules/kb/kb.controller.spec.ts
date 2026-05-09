import { Test, TestingModule } from '@nestjs/testing';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';

describe('KbController', () => {
  let controller: KbController;
  let service: KbService;

  const mockKbService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1', filename: 'deck.pdf' }]),
    uploadDocument: jest.fn().mockResolvedValue({ id: '1', filename: 'deck.pdf' })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KbController],
      providers: [
        {
          provide: KbService,
          useValue: mockKbService,
        },
      ],
    }).compile();

    controller = module.get<KbController>(KbController);
    service = module.get<KbService>(KbService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should findAll documents', async () => {
    const req = { user: { id: 'user1' } };
    const res = await controller.findAll(req);
    expect(res).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith('user1');
  });
});

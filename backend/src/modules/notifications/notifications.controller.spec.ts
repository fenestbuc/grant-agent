import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1', title: 'Test Alert' }]),
    markAsRead: jest.fn().mockResolvedValue({ success: true })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should findAll notifications', async () => {
    const req = { user: { id: 'user1' } };
    const res = await controller.findAll(req);
    expect(res).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith('user1');
  });
});

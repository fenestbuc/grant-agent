import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

describe('WatchlistController', () => {
  let controller: WatchlistController;
  let service: WatchlistService;

  const mockService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1', grant_id: 'grant1' }]),
    add: jest.fn().mockResolvedValue({ id: '1', grant_id: 'grant1' })
  };

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        {
          provide: WatchlistService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = testingModule.get<WatchlistController>(WatchlistController);
    service = testingModule.get<WatchlistService>(WatchlistService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should findAll watchlist items', async () => {
    const req = { user: { id: 'user1' } };
    const res = await controller.findAll(req);
    expect(res).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith('user1');
  });
});

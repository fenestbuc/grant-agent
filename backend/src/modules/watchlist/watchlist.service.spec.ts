import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  let service: WatchlistService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [WatchlistService],
    }).compile();

    service = testingModule.get<WatchlistService>(WatchlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

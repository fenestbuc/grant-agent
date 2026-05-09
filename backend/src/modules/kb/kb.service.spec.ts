import { Test, TestingModule } from '@nestjs/testing';
import { KbService } from './kb.service';

describe('KbService', () => {
  let service: KbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KbService],
    }).compile();

    service = module.get<KbService>(KbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { KbService } from './kb.service';

describe('KbService', () => {
  let service: KbService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [KbService],
    }).compile();

    service = testingModule.get<KbService>(KbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

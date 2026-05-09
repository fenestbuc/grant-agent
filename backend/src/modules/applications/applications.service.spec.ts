
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { LlmService } from '../llm/llm.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: LlmService,
          useValue: { generateAnswer: jest.fn() }
        }
      ],
    }).compile();

    service = testingModule.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

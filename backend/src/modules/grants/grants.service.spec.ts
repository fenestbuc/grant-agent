import { Test, TestingModule } from '@nestjs/testing';
import { GrantsService } from './grants.service';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Test Grant' }],
      count: 1,
      error: null
    }),
    single: jest.fn().mockResolvedValue({
      data: { id: '1', name: 'Test Grant' },
      error: null
    })
  }))
}));

describe('GrantsService', () => {
  let service: GrantsService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [GrantsService],
    }).compile();

    service = testingModule.get<GrantsService>(GrantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should findAll grants', async () => {
    const result = await service.findAll({});
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should findOne grant', async () => {
    const result = await service.findOne('1');
    expect(result.name).toBe('Test Grant');
  });
});

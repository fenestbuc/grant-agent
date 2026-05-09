import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: ApplicationsService;

  const mockAppService = {
    findAll: jest.fn().mockResolvedValue([{ id: '1', status: 'draft' }]),
    createOrUpdate: jest.fn().mockResolvedValue({ id: '1', status: 'draft' }),
    generateAnswer: jest.fn().mockResolvedValue({ answer: 'Mocked Answer' })
  };

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = testingModule.get<ApplicationsController>(ApplicationsController);
    service = testingModule.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should findAll applications for user', async () => {
    const req = { user: { id: 'user1' } };
    const res = await controller.findAll(req, 'grant1');
    expect(res).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith('user1', 'grant1');
  });

  it('should create application', async () => {
    const req = { user: { id: 'user1' } };
    const dto = { grantId: 'grant1', answers: {}, status: 'draft' };
    const res = await controller.create(req, dto);
    expect(res.status).toBe('draft');
    expect(service.createOrUpdate).toHaveBeenCalledWith('user1', dto);
  });
  
  it('should update application', async () => {
    const req = { user: { id: 'user1' } };
    const dto = { id: '1', grantId: 'grant1', answers: {}, status: 'submitted' };
    const res = await controller.update(req, dto);
    expect(res.status).toBe('draft'); // the mock returns draft
    expect(service.createOrUpdate).toHaveBeenCalledWith('user1', dto);
  });
});

import { ApplicationsService } from './applications.service';
export declare class ApplicationsController {
    private readonly applicationsService;
    constructor(applicationsService: ApplicationsService);
    findAll(req: any, grantId?: string): Promise<any[]>;
    create(req: any, dto: any): Promise<any>;
    update(req: any, dto: any): Promise<any>;
    generate(req: any, dto: {
        grantId: string;
        questionId: string;
    }): Promise<{
        answer: string;
    }>;
}

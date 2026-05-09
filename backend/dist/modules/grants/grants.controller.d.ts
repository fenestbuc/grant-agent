import { GrantsService } from './grants.service';
export declare class GrantsController {
    private readonly grantsService;
    constructor(grantsService: GrantsService);
    findAll(query: any): Promise<{
        data: any[];
        total: number | null;
        page: number;
        per_page: number;
    }>;
    findOne(id: string): Promise<any>;
}

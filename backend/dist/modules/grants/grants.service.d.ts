export declare class GrantsService {
    private supabase;
    constructor();
    findAll(query: any): Promise<{
        data: any[];
        total: number | null;
        page: number;
        per_page: number;
    }>;
    findOne(id: string): Promise<any>;
}

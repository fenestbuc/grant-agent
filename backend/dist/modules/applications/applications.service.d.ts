export declare class ApplicationsService {
    private supabase;
    constructor();
    findAll(userId: string, grantId?: string): Promise<any[]>;
    createOrUpdate(userId: string, dto: any): Promise<any>;
    generateAnswer(userId: string, grantId: string, questionId: string): Promise<{
        answer: string;
    }>;
}

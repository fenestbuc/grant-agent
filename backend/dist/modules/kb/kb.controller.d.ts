import { KbService } from './kb.service';
export declare class KbController {
    private readonly kbService;
    constructor(kbService: KbService);
    findAll(req: any): Promise<any[]>;
    uploadFile(req: any, file: any): Promise<{
        success: boolean;
        message: string;
    }>;
}

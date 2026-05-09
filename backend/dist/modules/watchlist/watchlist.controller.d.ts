import { WatchlistService } from './watchlist.service';
export declare class WatchlistController {
    private readonly watchlistService;
    constructor(watchlistService: WatchlistService);
    findAll(req: any): Promise<any[]>;
    add(req: any, body: any): {
        success: boolean;
    };
}

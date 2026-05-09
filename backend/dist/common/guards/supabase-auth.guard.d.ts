import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SupabaseAuthGuard implements CanActivate {
    private supabase;
    canActivate(context: ExecutionContext): Promise<boolean>;
}

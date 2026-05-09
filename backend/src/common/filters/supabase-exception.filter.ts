
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class SupabaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || res.error || message;
    } else if (exception?.code) {
      // Handle Supabase/PostgREST specific errors
      status = HttpStatus.BAD_REQUEST;
      message = exception.message || exception.details || 'Database error';
    }

    response.status(status).json({
      success: false,
      error: message,
      statusCode: status,
    });
  }
}

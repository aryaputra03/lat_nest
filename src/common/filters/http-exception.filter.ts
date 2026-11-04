import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message: string | string[] }).message;

    const errorName =
      typeof exceptionResponse === 'object' && 'error' in exceptionResponse
        ? (exceptionResponse as { error: string }).error
        : HttpStatus[status];

    response.status(status).json({
      statusCode: status,
      message,
      error: errorName,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

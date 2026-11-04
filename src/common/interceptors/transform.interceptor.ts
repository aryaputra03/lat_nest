import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: Record<string, unknown>;
}

function isAlreadyShaped(payload: unknown): payload is Response<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'meta' in payload
  );
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<unknown>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<unknown>> {
    return next.handle().pipe(
      map((payload): Response<unknown> => {
        if (isAlreadyShaped(payload)) {
          return payload;
        }

        return { data: payload ?? null };
      }),
    );
  }
}

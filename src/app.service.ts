/**
 * AppService
 * ----------
 * Small service that backs `AppController` and provides a single
 * `getHello()` helper used by the root endpoint. Kept intentionally
 * minimal as part of the NestJS scaffold.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

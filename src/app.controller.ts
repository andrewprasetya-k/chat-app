/**
 * AppController
 * ----------------
 * Simple root controller used by the application. Provides a single
 * health / hello endpoint handled by `AppService`.
 *
 * Routes:
 * - GET /      -> returns application greeting
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

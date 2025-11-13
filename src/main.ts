import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /* Enable global validation pipe so DTOs (class-validator) are enforced
    - whitelist: strip properties that do not have any decorator in the DTO
    - forbidNonWhitelisted: throw error when unknown props are present
    - transform: automatically transform payloads to DTO instances */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

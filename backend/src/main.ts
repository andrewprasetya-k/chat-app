import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // CONFIGURATION: Cross-Origin Resource Sharing (CORS)
  // 'credentials: true' sangat penting agar browser diizinkan mengirim Cookie 
  // (access_token & refresh_token) dari domain Vercel ke domain Railway.
  // Pastikan URL origin tidak diakhiri dengan slash (/).
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://c8sfg3vs-3001.asse.devtunnels.ms',
      'https://chat-app-fawn-one-16.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, 
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // global interceptor untuk otomatis mengubah json sesuai dto (menyamarkan nama kolom db)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

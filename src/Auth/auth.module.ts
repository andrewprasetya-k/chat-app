/**
 * AuthModule
 * ----------
 * Provides authentication-related wiring for the application.
 * - Registers `JwtModule` using env config
 * - Provides `AuthService`, `AuthController` and `AuthGuard`
 * - Exports `AuthService`, `AuthGuard` and `JwtModule` for use in other modules
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/User/user.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
// import { JwtStrategy } from './jwt.strategy'; // nanti opsional
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(), // supaya bisa pakai .env
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN
          ? isNaN(Number(process.env.JWT_EXPIRES_IN))
            ? process.env.JWT_EXPIRES_IN
            : Number(process.env.JWT_EXPIRES_IN)
          : '1h') as any,
      },
    }),
  // Import UserModule so AuthService can inject UserService
  UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // Export JwtModule as well so JwtService (provided by JwtModule)
  // is available to modules that import AuthModule and use AuthGuard.
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}

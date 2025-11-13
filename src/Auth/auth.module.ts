/**
 * AuthModule
 * ----------
 * Provides authentication-related wiring for the application.
 * - Registers `JwtModule` using env config
 * - Provides `AuthService`, `AuthController` and `AuthGuard`
 * - Exports `AuthService`, `AuthGuard` and `JwtModule` for use in other modules
 */
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/User/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn =
          configService.get<string | number>('JWT_EXPIRES_IN') ?? '1h';

        if (!secret && process.env.NODE_ENV !== 'development') {
          throw new Error(
            'JWT_SECRET environment variable is required for JwtModule',
          );
        }

        return {
          secret: secret ?? 'dev-secret',
          signOptions: {
            expiresIn: isNaN(Number(expiresIn))
              ? expiresIn
              : (Number(expiresIn) as any),
          },
        };
      },
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],

  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}

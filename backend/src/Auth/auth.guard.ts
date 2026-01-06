import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * AuthGuard
 * ---------
 * Guard ini bertugas memeriksa apakah incoming HTTP request memiliki
 * JWT (JSON Web Token) yang valid di header `Authorization` dengan
 * skema `Bearer <token>`.
 *
 * Ringkasan alur:
 * - Ambil header `Authorization`
 * - Extract token bila formatnya `Bearer <token>`
 * - Verify token menggunakan `JwtService` dan secret dari env
 * - Jika valid, attach payload token ke `request.user` sehingga
 *   controller dapat mengakses data user (mis. `req.user.sub`)
 * - Jika tidak valid atau tidak ada token, lempar `UnauthorizedException`
 *
 * Catatan keamanan:
 * - Pastikan `process.env.JWT_SECRET` di-set di environment (tidak di-commit)
 * - Jangan menyimpan data sensitif (mis. password) di payload JWT
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * JwtService di-inject melalui constructor. Digunakan untuk
   * memverifikasi dan mendecode JWT.
   */
  constructor(private jwtService: JwtService) {}

  /**
   * canActivate
   * - Dipanggil oleh NestJS sebelum request mencapai controller.
   * - Mengembalikan `true` jika request diizinkan, atau melempar
   *   `UnauthorizedException` jika token tidak ada/invalid.
   */

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Prioritize cookie, fallback to header
    const token =
      this.extractTokenFromCookie(request) ||
      this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      request['user'] = payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.['access_token'];
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
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
+   * JwtService di-inject melalui constructor. Digunakan untuk
+   * memverifikasi dan mendecode JWT.
+   */
  constructor(private jwtService: JwtService) {}
  
  /**
   * canActivate
   * - Dipanggil oleh NestJS sebelum request mencapai controller.
   * - Mengembalikan `true` jika request diizinkan, atau melempar
   *   `UnauthorizedException` jika token tidak ada/invalid.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Ambil object request Express dari context
    const request = context.switchToHttp().getRequest();
    
    // 1) Extract token dari header Authorization (jika ada)
    const token = this.extractTokenFromHeader(request);
    
    // Jika tidak ada token -> unauthorized
    if (!token) {
      // Memberi respon HTTP 401 ke client
      throw new UnauthorizedException('Token not found');
    }
    
    try {
      // 2) Verify token secara asynchronous.
      //    verifyAsync akan melempar error jika token invalid atau expired.
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      
      // 3) Jika token valid, attach payload ke request.
      //    Konvensi: menyimpan ke `request.user` agar controller dan
      //    service lain bisa mengakses identitas user.
      request['user'] = payload;
      
    } catch (error) {
      // Kalau verifikasi gagal (mis. expired, signature mismatch),
      // beri 401 Unauthorized.
      throw new UnauthorizedException('Invalid token');
    }
    
    // Semua pemeriksaan lolos => izinkan akses.
    return true;
  }

  /**
   * extractTokenFromHeader
   * - Helper function untuk mengambil token dari header
   *   `Authorization: Bearer <token>`
   * - Mengembalikan token jika format benar, atau `undefined` kalau tidak.
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    // Ambil header authorization. Contoh: "Bearer eyJhbGci..."
    // Optional chaining (?) dipakai karena header mungkin undefined.
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    // Pastikan skema adalah 'Bearer' (case sensitive) sebelum return token
    return type === 'Bearer' ? token : undefined;
  }
}
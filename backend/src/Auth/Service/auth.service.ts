/**
 * AuthService
 * -----------
 * Responsible for user registration and authentication flows. Currently
 * this service uses an in-memory array (`users`) as a temporary store.
 * In a production setup this should delegate to a persistent user store
 * (e.g. Supabase via `UserService`).
 *
 * Public methods:
 * - register(registerDto) -> creates a new user (temporary in-memory)
 * - login(loginDto) -> validates credentials and returns a signed JWT
 */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../Dto/login.dto';
import { RegisterDto } from '../Dto/register.dto';
import { UserService } from 'src/User/Service/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  // Register user baru (menggunakan UserService -> Supabase)
  //todo: sebelum prod tambahkan email verification dan tambah kolom role
  async register(registerDto: RegisterDto) {
    try {
      const { email, password, fullName } = registerDto;

      const created = await this.userService.createUser({
        email,
        fullName,
        password,
        // role is not exposed in RegisterDto for public registration
      });

      // Auto login or just return success
      // Let's generate tokens for seamless UX if needed, but standard is usually return success
      // For now, let's keep returning success message
      return {
        message: 'User registered successfully',
        userId: created?.id,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      if (err instanceof InternalServerErrorException) throw err;

      throw new InternalServerErrorException(
        err?.message ?? 'Failed to register user',
      );
    }
  }

  // Login user -> cari di DB dan verifikasi password
  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Type assertion for the raw DB user object since findByEmailForAuth returns any/unknown
      const user = (await this.userService.findByEmailForAuth(email)) as {
        usr_id: string;
        usr_email: string;
        usr_nama_lengkap: string;
        usr_role: string;
        usr_password: string;
      } | null;

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.usr_password || '',
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.getTokens(
        user.usr_id,
        user.usr_email,
        user.usr_nama_lengkap,
        user.usr_role,
      );
      await this.updateRefreshToken(user.usr_id, tokens.refresh_token);

      return tokens;
    } catch (err) {
      // Forward Unauthorized errors unchanged
      if (err instanceof UnauthorizedException) throw err;

      // If lower layer already produced a Nest HTTP error, forward it
      if (
        err instanceof InternalServerErrorException ||
        err instanceof BadRequestException
      )
        throw err;

      throw new InternalServerErrorException(err?.message ?? 'Failed to login');
    }
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
    return { message: 'User logged out successfully' };
  }

  async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new ForbiddenException('Invalid Refresh Token Signature');
    }

    const userId = payload.sub;
    const user = (await this.userService.findByIdForAuth(userId)) as {
      usr_id: string;
      usr_email: string;
      usr_nama_lengkap: string;
      usr_role: string;
      usr_refresh_token: string;
    } | null;

    if (!user || !user.usr_refresh_token)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.usr_refresh_token,
    );

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(
      user.usr_id,
      user.usr_email,
      user.usr_nama_lengkap,
      user.usr_role,
    );
    await this.updateRefreshToken(user.usr_id, tokens.refresh_token);
    return tokens;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(userId, hash);
  }

  async getTokens(userId: string, email: string, name: string, role: string) {
    const payload = {
      sub: userId,
      email: email,
      name: name,
      role: role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '12h', // Access token short lived
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '14d', // Refresh token long lived
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: userId,
        email: email,
        fullName: name,
        role: role,
      },
    };
  }
}

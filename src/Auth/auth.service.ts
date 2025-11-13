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
import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './Dto/login.dto';
import { RegisterDto } from './Dto/register.dto';
import { UserService } from 'src/User/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService, private readonly userService: UserService) {}

  // Register user baru (menggunakan UserService -> Supabase)
  async register(registerDto: RegisterDto) {
    try {
      const { email, password, fullName, role } = registerDto as any;

      // Delegasikan pembuatan user ke UserService (akan melempar BadRequest jika email duplikat)
      const created = await this.userService.createUser({ email, fullName, password, role });

      return { message: 'User registered successfully', userId: created?.usr_id };
    } catch (err) {
      // If UserService already threw a BadRequest (e.g. duplicate email), forward it.
      if (err instanceof BadRequestException) throw err;

      // If it's already a Nest HTTP error, rethrow so we preserve correct status.
      if (err instanceof InternalServerErrorException) throw err;

      // For debugging: preserve the original error message inside the 500
      // so the caller / logs can surface the real cause. In production you
      // might want to hide details and log them instead.
      throw new InternalServerErrorException(err?.message ?? 'Failed to register user');
    }
  }

  // Login user -> cari di DB dan verifikasi password
  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto as any;

      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // user.usr_password holds the hash
      const isPasswordValid = await bcrypt.compare(password, (user as any).usr_password || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Buat JWT token dengan payload yang berguna untuk aplikasi
      const payload = {
        sub: (user as any).usr_id,
        email: (user as any).usr_email,
        name: (user as any).usr_nama_lengkap,
        role: (user as any).usr_role,
      };

      const token = this.jwtService.sign(payload);
      return { access_token: token };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Failed to login');
    }
  }
}

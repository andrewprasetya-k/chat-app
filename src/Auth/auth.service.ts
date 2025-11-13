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
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './Dto/login.dto';
import { RegisterDto } from './Dto/register.dto';
import { UserService } from 'src/User/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  // Register user baru (menggunakan UserService -> Supabase)
  async register(registerDto: RegisterDto) {
    try {
      const { email, password, fullName, role } = registerDto as any;

      const created = await this.userService.createUser({
        email,
        fullName,
        password,
        role,
      });

      return {
        message: 'User registered successfully',
        userId: created?.usr_id,
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
      const { email, password } = loginDto as any;

      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        (user as any).usr_password || '',
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = {
        sub: (user as any).usr_id,
        email: (user as any).usr_email,
        name: (user as any).usr_nama_lengkap,
        role: (user as any).usr_role,
      };

      const token = this.jwtService.sign(payload);
      return { access_token: token };
    } catch (err) {
      // Forward Unauthorized errors unchanged
      if (err instanceof UnauthorizedException) throw err;

      // If lower layer already produced a Nest HTTP error, forward it
      if (
        err instanceof InternalServerErrorException ||
        err instanceof BadRequestException
      )
        throw err;

      console.error('AuthService.login error:', err);
      throw new InternalServerErrorException(err?.message ?? 'Failed to login');
    }
  }
}

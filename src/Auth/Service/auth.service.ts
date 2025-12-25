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
import { LoginDto } from '../Dto/login.dto';
import { RegisterDto } from '../Dto/register.dto';
import { UserService } from 'src/User/Service/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
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

      const payload = {
        sub: user.usr_id,
        email: user.usr_email,
        name: user.usr_nama_lengkap,
        role: user.usr_role,
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

      throw new InternalServerErrorException(err?.message ?? 'Failed to login');
    }
  }

  async logout() {
    return { message: 'User logged out successfully' };
  }
}

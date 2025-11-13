import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './Dto/login.dto';
import { RegisterDto } from './Dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // Minta service untuk buat user baru
    return this.authService.register(registerDto);
  }

  // POST /auth/login
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // Minta service untuk generate JWT token
    return this.authService.login(loginDto);
  }
}

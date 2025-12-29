import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from '../Service/auth.service';
import { LoginDto } from '../Dto/login.dto';
import { RegisterDto } from '../Dto/register.dto';
import { AuthGuard } from '../auth.guard';
import { User } from '../user.decorator';
import { RefreshTokenDto } from '../Dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@User('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Get('api-check')
  async dbCheck() {
    return { message: 'api connection is healthy' };
  }
}

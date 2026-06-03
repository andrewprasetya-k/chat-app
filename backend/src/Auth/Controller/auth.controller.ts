import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthService } from '../Service/auth.service';
import { LoginDto } from '../Dto/login.dto';
import { RegisterDto } from '../Dto/register.dto';
import { AuthGuard } from '../auth.guard';
import { User } from '../user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(loginDto);

    // COOKIE POLICY: Cross-Site Authentication
    // httpOnly: Mencegah akses JavaScript (aman dari XSS).
    // secure: true: WAJIB aktif saat SameSite=None agar Cookie dikirim lewat HTTPS.
    // sameSite: 'none': Mengizinkan Cookie dikirim antar domain yang berbeda (Cross-Site).

    // 1. Set Refresh Token (Long Lived)
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    // 2. Set Access Token (Short Lived)
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Return only User Info (Tokens are in cookies now)
    return {
      user: tokens.user,
    };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(
    @User('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    return { message: 'User logged out successfully' };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('No Refresh Token found');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // COOKIE POLICY: Cross-Site Authentication (Consistent with Login)

    // Rotate Refresh Token
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    // Update Access Token
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    return { message: 'Token refreshed' };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('google')
  @UseGuards(PassportAuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleAuthCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Handle the callback from Google
    const tokens = await this.authService.handleGoogleLogin(req.user);

    // COOKIE POLICY: Cross-Site Authentication
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.redirect(process.env.FRONTEND_URL + '/dashboard');
  }

  @Get('api-check')
  async dbCheck() {
    return { message: 'api connection is healthy' };
  }
}

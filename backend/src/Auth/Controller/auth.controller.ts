import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
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

    // Set Refresh Token in HttpOnly Cookie
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'strict', // protects against CSRF
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    // Return only Access Token to frontend
    return {
      access_token: tokens.access_token,
      user: tokens.user, // Assuming service returns user info too
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

    // Update Refresh Token Cookie (Rotation)
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: tokens.access_token,
    };
  }

  @Get('api-check')
  async dbCheck() {
    return { message: 'api connection is healthy' };
  }
}

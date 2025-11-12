import { Controller, Get, Put, UseGuards, Request, Body } from '@nestjs/common';
import { AuthGuard } from '../Auth/auth.guard';

@Controller('users')
export class UserController {
  
  // Route tidak dilindungi (public)
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }
  
  // Route dilindungi (perlu JWT)
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    // Bisa akses user data dari JWT payload
    return {
      userId: req.user.sub,
      email: req.user.email,
      username: req.user.username,
    };
  }
}
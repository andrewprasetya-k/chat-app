import { Controller, Get, Put, UseGuards, Request, Body } from '@nestjs/common';
import { AuthGuard } from '../Auth/auth.guard';
import { UserService } from 'src/Service/user.service';

@Controller('users')
export class UserController {
    constructor(private readonly UserService: UserService) {}
  
    // Route tidak dilindungi (public)
    @Get('public')
    getPublicData() {
    return this.UserService.getUser();
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
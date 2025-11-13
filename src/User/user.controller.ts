import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../Auth/auth.guard';
import { UserService } from 'src/User/user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}
  
    // Route tidak dilindungi (public)
    @Get('public')
    getPublicData() {
        return this.userService.getAllUsers();
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
/**
 * UserController
 * --------------
 * Routes related to user operations. This controller exposes a public
 * `/users/public` endpoint and a protected `/users/profile` endpoint
 * that relies on `AuthGuard` to ensure the request carries a valid JWT.
 */
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../Auth/auth.guard';
import { UserService } from 'src/User/user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    // Route tidak dilindungi (public)
    @Get('public')
    getPublicData() {
        // Placeholder public endpoint; can be expanded to return real user list
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
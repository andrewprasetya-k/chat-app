/**
 * UserController
 * --------------
 * Routes related to user operations. This controller exposes a public
 * `/users/public` endpoint and a protected `/users/profile` endpoint
 * that relies on `AuthGuard` to ensure the request carries a valid JWT.
 */
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '../../Auth/auth.guard';
import { UserService } from 'src/User/Service/user.service';
import { EditUserDto } from '../Dto/edit.user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      userId: req.user.sub,
      email: req.user.email,
      username: req.user.name,
    };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  editProfile(@Body() body: EditUserDto) {
    return this.userService.editUserService(body);
  }

  @UseGuards(AuthGuard)
  @Get(':userId')
  getUserByIdControler(@Param('userId') userId: string) {
    return this.userService.getUserByIdService(userId);
  }
}

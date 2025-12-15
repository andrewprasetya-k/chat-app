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
  Put,
  Patch,
  Req,
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
    return this.userService.getUserByIdService(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  editProfile(@Body() body: EditUserDto, @Request() req) {
    return this.userService.editUserService(body, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get(':userId')
  getUserByIdControler(@Param('userId') userId: string) {
    return this.userService.getUserByIdService(userId);
  }
}

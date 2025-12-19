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
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthGuard } from '../../Auth/auth.guard';
import { UserService } from 'src/User/Service/user.service';
import { EditUserDto } from '../Dto/edit-user.dto';
import { TransformUtil, UserEntity } from 'src/shared';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor) // Auto-transform entities
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('get-all')
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return await this.userService.getUserByIdService(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  async editProfile(@Body() body: EditUserDto, @Request() req) {
    return await this.userService.editUserService(body, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('search/email/:email')
  async findProfileByEmail(@Param('email') email: string, @Request() req) {
    return await this.userService.findByEmail(email);
  }

  @UseGuards(AuthGuard)
  @Get('search/name/:fullName')
  async findProfileByFullName(
    @Param('fullName') fullName: string,
    @Request() req,
  ) {
    return await this.userService.findByFullName(fullName);
  }

  @UseGuards(AuthGuard)
  @Get('test-entity')
  async testEntity() {
    // Test entity transformation
    const testData = {
      usr_id: '123',
      usr_nama_lengkap: 'Test User',
      usr_email: 'test@example.com',
      usr_role: 'user',
      created_at: new Date().toISOString(),
    };
    
    return TransformUtil.transform(UserEntity, testData);
  }

  @UseGuards(AuthGuard)
  @Get('test-partial')
  async testPartialQuery() {
    // Test partial query without role
    const client = this.userService['supabase'].getClient();
    const { data } = await client
      .from('user')
      .select('usr_id, usr_nama_lengkap, usr_email') // No usr_role
      .limit(1);
    
    return TransformUtil.transform(UserEntity, data || []);
  }

  @UseGuards(AuthGuard)
  @Get(':userId')
  async getUserByIdControler(@Param('userId') userId: string) {
    return await this.userService.getUserByIdService(userId);
  }
}

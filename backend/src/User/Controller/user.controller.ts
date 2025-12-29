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
  Post,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../Auth/auth.guard';
import { UserService } from 'src/User/Service/user.service';
import { SupabaseService } from 'src/Supabase/supabase.service';
import { EditUserDto } from '../Dto/edit-user.dto';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor) // Auto-transform entities
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // 1. Upload ke Supabase (folder: users/{userId})
    const avatarUrl = await this.supabaseService.uploadFile(
      file,
      'avatars', // Pastikan bucket 'avatars' sudah dibuat di Supabase Dashboard
      `users/${req.user.sub}`,
    );

    // 2. Update URL di Database User
    await this.userService.updateAvatar(req.user.sub, avatarUrl);

    return {
      success: true,
      message: 'Avatar updated successfully',
      data: { avatarUrl },
    };
  }

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
  @Get(':userId')
  async getUserByIdController(@Param('userId') userId: string) {
    return await this.userService.getUserByIdService(userId);
  }
}

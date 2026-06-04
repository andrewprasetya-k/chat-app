import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../Dto/login.dto';
import { RegisterDto } from '../Dto/register.dto';
import { ForgotPasswordDto } from '../Dto/forgot-password.dto';
import { ResetPasswordDto } from '../Dto/reset-password.dto';
import { UserService } from 'src/User/Service/user.service';
import { MailService } from 'src/Mail/mail.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const token = uuidv4();
    const created = await this.userService.createUser({ ...dto, verificationToken: token });
    await this.mailService.sendVerificationEmail(dto.email, token);
    return { message: 'Registered. Check email.', userId: created.id };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const u = await this.userService.findByEmailForAuth(dto.email);
    if (!u) throw new BadRequestException('User not found');
    const token = uuidv4();
    await this.userService.setResetPasswordToken(u.usr_email, token);
    await this.mailService.sendResetPasswordEmail(u.usr_email, token);
    return { message: 'Email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    return await this.userService.resetPassword(dto.token, hash);
  }

  async verifyEmail(token: string) {
    return this.userService.verifyUser(token);
  }

  async handleGoogleLogin(googleUser: { email: string; name: string }) {
    let u = await this.userService.findByEmailForAuth(googleUser.email);
    if (!u) {
      const created = await this.userService.createUser({ email: googleUser.email, fullName: googleUser.name, password: uuidv4() });
      u = await this.userService.findByIdForAuth(created.id);
    } else if (!u.usr_is_verified) {
      await this.userService.verifyUserByEmail(u.usr_email);
    }

    const t = await this.getTokens(u.usr_id, u.usr_email, u.usr_nama_lengkap, u.usr_role || 'user');
    await this.updateRefreshToken(u.usr_id, t.refresh_token);
    return t;
  }

  async login(dto: LoginDto) {
    const u = await this.userService.findByEmailForAuth(dto.email);
    if (!u || !(await bcrypt.compare(dto.password, u.usr_password || ''))) throw new UnauthorizedException('Invalid credentials');
    if (!u.usr_is_verified) throw new UnauthorizedException('Email not verified');

    const t = await this.getTokens(u.usr_id, u.usr_email, u.usr_nama_lengkap, u.usr_role);
    await this.updateRefreshToken(u.usr_id, t.refresh_token);
    return t;
  }

  async logout(uid: string) {
    await this.userService.updateRefreshToken(uid, null);
    return { success: true };
  }

  async refreshTokens(rt: string) {
    try {
      const p = await this.jwtService.verifyAsync(rt, { secret: this.configService.get('JWT_REFRESH_SECRET') });
      const u = await this.userService.findByIdForAuth(p.sub);
      if (!u || !u.usr_refresh_token || !(await bcrypt.compare(rt, u.usr_refresh_token))) throw new ForbiddenException();
      const t = await this.getTokens(u.usr_id, u.usr_email, u.usr_nama_lengkap, u.usr_role);
      await this.updateRefreshToken(u.usr_id, t.refresh_token);
      return t;
    } catch {
      throw new ForbiddenException();
    }
  }

  async updateRefreshToken(uid: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.userService.updateRefreshToken(uid, hash);
  }

  async getTokens(uid: string, email: string, name: string, role: string) {
    const payload = { sub: uid, email, name, role };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: this.configService.get('JWT_SECRET'), expiresIn: '12h' }),
      this.jwtService.signAsync(payload, { secret: this.configService.get('JWT_REFRESH_SECRET'), expiresIn: '14d' }),
    ]);
    return { access_token: at, refresh_token: rt, user: { id: uid, email, fullName: name, role } };
  }
}

import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './Dto/login.dto';
import { RegisterDto } from './Dto/register.dto';

interface User {
  id: number;
  email: string;
  password: string;
}

// ⚠️ Catatan: nanti user akan diambil dari database
// tapi untuk sementara kita simpan di array agar bisa dites
const users: User[] = [];

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  //Register user baru
  async register(registerDto: RegisterDto) {
    try {
      const { email, password } = registerDto;

      // Cek apakah user sudah ada
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Simpan user ke "database"
      const newUser: User = {
        id: users.length + 1,
        email,
        password: hashedPassword,
      };
      users.push(newUser);

      return { message: 'User registered successfully', userId: newUser.id };
    } catch (err) {
      // Rethrow known HTTP exceptions
      if (err instanceof BadRequestException) throw err;
      // Unexpected errors -> 500
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  //Login user
  async login(loginDto: LoginDto) {
    try {
      const { username, password } = loginDto;

      const user = users.find((u) => u.email === username);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Cek apakah password cocok
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Buat JWT token
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return { access_token: token };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Failed to login');
    }
  }
}

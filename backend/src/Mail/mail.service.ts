import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host =
      this.configService.get<string>('MAIL_SERVER') || 'smtp.gmail.com';
    const port = this.configService.get<number>('MAIL_PORT') || 587;
    const user = this.configService.get<string>('MAIL_USERNAME');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    console.log('MailService Config Debug:', {
      host,
      port,
      user,
      hasPass: !!pass,
    });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const url = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: '"Chat App" <noreply@chatapp.com>',
      to: to,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to Chat App!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${url}">Verify Email</a>
        <p>If you did not sign up for this account, please ignore this email.</p>
      `,
    };

    try {
      // If no credentials are set, log the link instead of failing (for development)
      if (
        !this.configService.get<string>('MAIL_USERNAME') ||
        !this.configService.get<string>('MAIL_PASSWORD')
      ) {
        console.log(
          '------------------------------------------------------------',
        );
        console.log('Use [MailService] Mock Send:', to);
        console.log('Verification URL:', url);
        console.log(
          '------------------------------------------------------------',
        );
        return;
      }

      await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully to:', to);
    } catch (error: any) {
      console.error('Email send failed:', error);
      throw new InternalServerErrorException(
        'Could not send verification email',
      );
    }
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const url = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: '"Chat App" <noreply@chatapp.com>',
      to: to,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${url}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      // If no credentials are set, log the link instead of failing (for development)
      if (
        !this.configService.get<string>('MAIL_USERNAME') ||
        !this.configService.get<string>('MAIL_PASSWORD')
      ) {
        console.log(
          '------------------------------------------------------------',
        );
        const host = this.configService.get<string>('MAIL_SERVER');
        const user = this.configService.get<string>('MAIL_USERNAME');
        const pass = this.configService.get<string>('MAIL_PASSWORD');

        // DEBUG INI SANGAT PENTING
        console.log('--- DEBUG MAIL CONFIG ---');
        console.log('MAIL_HOST:', host);
        console.log('MAIL_USER:', user);
        console.log('MAIL_PASSWORD length:', pass ? pass.length : 0);
        console.log('-------------------------');
        console.log('Use [MailService] Mock Send:', to);
        console.log('Reset Password URL:', url);
        console.log(
          '------------------------------------------------------------',
        );
        return;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Reset password email sent successfully:', info.messageId);
    } catch (error: any) {
      console.error('Email send failed:', error);
      throw new InternalServerErrorException(
        'Could not send reset password email',
      );
    }
  }
}

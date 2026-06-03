import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'smtp.gmail.com', // Default to gmail for now as placeholder
      port: this.configService.get<number>('MAIL_PORT') || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
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
        !this.configService.get<string>('MAIL_USER') ||
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
    } catch (error: any) {
      console.error('Email send failed:', error);
      throw new InternalServerErrorException(
        'Could not send verification email',
      );
    }
  }
}

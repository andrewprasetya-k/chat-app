import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly mailUser: string | undefined;
  private readonly mailPass: string | undefined;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_SERVER') || 'smtp.gmail.com';
    const port = this.configService.get<number>('MAIL_PORT') || 587;
    this.mailUser = this.configService.get<string>('MAIL_USERNAME');
    this.mailPass = this.configService.get<string>('MAIL_PASSWORD');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    console.log('MailService Config Debug:', { host, port, user: this.mailUser, hasPass: !!this.mailPass });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.mailUser,
        pass: this.mailPass,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const html = `
        <h1>Welcome to Chat App!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${url}">Verify Email</a>
        <p>If you did not sign up for this account, please ignore this email.</p>
      `;

    await this.sendEmail(to, subject, html, 'Verification URL:', url);
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Reset Your Password';
    const html = `
        <h1>Password Reset Request</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${url}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `;

    await this.sendEmail(to, subject, html, 'Reset Password URL:', url);
  }

  private async sendEmail(to: string, subject: string, html: string, logLabel: string, logValue: string) {
    const mailOptions = {
      from: '"Chat App" <noreply@chatapp.com>',
      to,
      subject,
      html,
    };

    if (!this.mailUser || !this.mailPass) {
      this.logMockEmail(to, logLabel, logValue);
      return;
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email '${subject}' sent successfully:`, info.messageId);
    } catch (error: any) {
      console.error(`Email '${subject}' failed:`, error);
      throw new InternalServerErrorException(`Could not send ${subject.toLowerCase()} email`);
    }
  }

  private logMockEmail(to: string, label: string, value: string) {
    console.log('------------------------------------------------------------');
    console.log('Use [MailService] Mock Send:', to);
    console.log(`${label}`, value);
    console.log('------------------------------------------------------------');
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    // Ambil request dari context HTTP
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // user yg sudah diset oleh AuthGuard

    // Jika @User('email'), ambil user.email
    // Jika @User() saja, return seluruh object user
    return data ? user?.[data] : user;
  },
);

import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AccessPayload } from './auth.types.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';

const COOKIE = 'agendai_refresh';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/v1/auth', maxAge: 30 * 86400_000 });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private send(res: Response, result: { accessToken: string; refreshToken: string; user: object }) {
    res.cookie(COOKIE, result.refreshToken, cookieOptions());
    return res.json({ accessToken: result.accessToken, user: result.user });
  }
  @UseGuards(AuthRateLimitGuard) @Post('register') async register(@Body() dto: RegisterDto, @Res() res: Response) { return this.send(res, await this.auth.register(dto)); }
  @UseGuards(AuthRateLimitGuard) @Post('login') async login(@Body() dto: LoginDto, @Res() res: Response) { return this.send(res, await this.auth.login(dto)); }
  @UseGuards(AuthRateLimitGuard) @Post('refresh') async refresh(@Req() req: Request, @Res() res: Response) { return this.send(res, await this.auth.refresh(req.cookies?.[COOKIE])); }
  @Post('logout') async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    return res.json({ success: true });
  }
  @UseGuards(AuthGuard) @Get('me') me(@CurrentUser() user: AccessPayload) { return this.auth.me(user.sub); }
  @UseGuards(AuthGuard) @Patch('me') updateProfile(@CurrentUser() user: AccessPayload, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(user.sub, dto); }
}

import { Body, Controller, Get, HttpException, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto, GoogleAuthDto, LoginDto, MobileRefreshDto, RegisterDto, ResendVerificationDto, ResetPasswordDto, UpdateProfileDto, VerifyEmailDto } from './auth.dto.js';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AccessPayload } from './auth.types.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { TurnstileService } from './turnstile.service.js';

const COOKIE = 'agendai_refresh';
const GOOGLE_NONCE_COOKIE = 'agendai_google_nonce';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/v1/auth', maxAge: 30 * 86400_000 });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly turnstile: TurnstileService) {}
  private send(res: Response, result: { accessToken: string; refreshToken: string; user: object }) {
    res.cookie(COOKIE, result.refreshToken, cookieOptions());
    return res.json({ accessToken: result.accessToken, user: result.user });
  }
  @UseGuards(AuthRateLimitGuard) @Post('register') async register(@Body() dto: RegisterDto, @Req() req: Request, @Res() res: Response) {
    await this.turnstile.verify(dto.turnstileToken, 'register', req.ip);
    const { turnstileToken: _turnstileToken, ...input } = dto;
    const result = await this.auth.register(input);
    if ('verificationRequired' in result) return res.status(202).json(result);
    return this.send(res, result);
  }
  @UseGuards(AuthRateLimitGuard) @Post('mobile/register') async mobileRegister(@Body() dto: RegisterDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, 'register', req.ip);
    const { turnstileToken: _turnstileToken, ...input } = dto;
    return this.auth.register(input);
  }
  @UseGuards(AuthRateLimitGuard) @Post('login') async login(@Body() dto: LoginDto, @Res() res: Response) { return this.send(res, await this.auth.login(dto)); }
  @UseGuards(AuthRateLimitGuard) @Get('google/nonce') googleNonce(@Res() res: Response) {
    const nonce = this.auth.googleNonce();
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(GOOGLE_NONCE_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth', maxAge: 5 * 60_000 });
    return res.json({ nonce });
  }
  @UseGuards(AuthRateLimitGuard) @Post('google') async google(@Body() dto: GoogleAuthDto, @Req() req: Request, @Res() res: Response) {
    try {
      if (dto.mode === 'REGISTER') await this.turnstile.verify(dto.turnstileToken, 'register', req.ip);
      const result = await this.auth.googleAuth(dto, req.cookies?.[GOOGLE_NONCE_COOKIE]);
      res.clearCookie(GOOGLE_NONCE_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth' });
      return this.send(res, result);
    } catch (error) {
      const response = error instanceof HttpException ? error.getResponse() : null;
      const mfaRequired = Boolean(response && typeof response === 'object' && 'code' in response && response.code === 'MFA_REQUIRED');
      if (!mfaRequired) res.clearCookie(GOOGLE_NONCE_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth' });
      throw error;
    }
  }
  @UseGuards(AuthRateLimitGuard) @Post('mobile/login') mobileLogin(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @UseGuards(AuthRateLimitGuard) @Post('mobile/refresh') mobileRefresh(@Body() dto: MobileRefreshDto) { return this.auth.refresh(dto.refreshToken); }
  @UseGuards(AuthRateLimitGuard) @Post('mobile/logout') mobileLogout(@Body() dto: MobileRefreshDto) { return this.auth.logout(dto.refreshToken); }
  @UseGuards(AuthRateLimitGuard) @Post('password/forgot') forgotPassword(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto); }
  @UseGuards(AuthRateLimitGuard) @Post('password/reset') resetPassword(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
  @UseGuards(AuthRateLimitGuard) @Post('verify-email') verifyEmail(@Body() dto: VerifyEmailDto) { return this.auth.verifyEmail(dto.token); }
  @UseGuards(AuthRateLimitGuard) @Post('verify-email/resend') resendVerification(@Body() dto: ResendVerificationDto) { return this.auth.resendVerification(dto); }
  @UseGuards(AuthRateLimitGuard) @Post('refresh') async refresh(@Req() req: Request, @Res() res: Response) { return this.send(res, await this.auth.refresh(req.cookies?.[COOKIE])); }
  @Post('logout') async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    return res.json({ success: true });
  }
  @UseGuards(AuthGuard) @Get('me') me(@CurrentUser() user: AccessPayload) { return this.auth.me(user.sub); }
  @UseGuards(AuthGuard) @Patch('me') updateProfile(@CurrentUser() user: AccessPayload, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(user.sub, dto); }
}

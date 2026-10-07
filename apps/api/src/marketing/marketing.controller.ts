import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { TurnstileService } from '../auth/turnstile.service.js';
import { ContactDto, NewsletterSubscribeDto, NewsletterTokenDto } from './marketing.dto.js';
import { MarketingService } from './marketing.service.js';

@UseGuards(AuthRateLimitGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService, private readonly turnstile: TurnstileService) {}
  @Post('contact') async contact(@Body() dto: ContactDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, 'contact', req.ip);
    const { turnstileToken: _turnstileToken, ...input } = dto;
    return this.marketing.contact(input);
  }
  @Post('newsletter/subscribe') async subscribe(@Body() dto: NewsletterSubscribeDto, @Req() req: Request) {
    await this.turnstile.verify(dto.turnstileToken, 'newsletter', req.ip);
    const { turnstileToken: _turnstileToken, ...input } = dto;
    return this.marketing.subscribe(input);
  }
  @Post('newsletter/confirm') confirm(@Body() dto: NewsletterTokenDto) { return this.marketing.confirmNewsletter(dto.token); }
  @Post('newsletter/unsubscribe') unsubscribe(@Body() dto: NewsletterTokenDto) { return this.marketing.unsubscribe(dto.token); }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { ContactDto, NewsletterSubscribeDto, NewsletterTokenDto } from './marketing.dto.js';
import { MarketingService } from './marketing.service.js';

@UseGuards(AuthRateLimitGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}
  @Post('contact') contact(@Body() dto: ContactDto) { return this.marketing.contact(dto); }
  @Post('newsletter/subscribe') subscribe(@Body() dto: NewsletterSubscribeDto) { return this.marketing.subscribe(dto); }
  @Post('newsletter/confirm') confirm(@Body() dto: NewsletterTokenDto) { return this.marketing.confirmNewsletter(dto.token); }
  @Post('newsletter/unsubscribe') unsubscribe(@Body() dto: NewsletterTokenDto) { return this.marketing.unsubscribe(dto.token); }
}

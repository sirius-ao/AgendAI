import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../auth/email.service.js';
import type { ContactDto, NewsletterSubscribeDto } from './marketing.dto.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  async contact(input: ContactDto) {
    try {
      await this.email.sendContact({ ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), school: input.school?.trim() || '' });
    } catch (error) {
      this.logger.error(`Contact email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException('Não foi possível enviar a mensagem. Tente novamente mais tarde.');
    }
    return { success: true };
  }

  async subscribe(input: NewsletterSubscribeDto) {
    const email = input.email.trim().toLowerCase();
    const old = await this.prisma.newsletterSubscription.findUnique({ where: { email } });
    if (old?.confirmedAt && !old.unsubscribedAt) return { success: true };
    if (old && !old.confirmedAt && Date.now() - old.updatedAt.getTime() < 5 * 60_000) return { success: true };
    const token = randomBytes(36).toString('base64url');
    const unsubscribeToken = randomBytes(36).toString('base64url');
    const consentAt = new Date();
    const expiresAt = new Date(Date.now() + 24 * 3600_000);
    await this.prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email, consentAt, confirmationTokenHash: digest(token), confirmationExpiresAt: expiresAt, unsubscribeTokenHash: digest(unsubscribeToken) },
      update: { consentAt, confirmedAt: null, unsubscribedAt: null, confirmationTokenHash: digest(token), confirmationExpiresAt: expiresAt, unsubscribeTokenHash: digest(unsubscribeToken) },
    });
    try {
      await this.email.sendNewsletterConfirmation(email, token, unsubscribeToken);
    } catch (error) {
      this.logger.error(`Newsletter confirmation email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException('Não foi possível enviar a confirmação. Tente novamente mais tarde.');
    }
    return { success: true };
  }

  async confirmNewsletter(rawToken: string) {
    const tokenHash = digest(rawToken);
    const result = await this.prisma.newsletterSubscription.updateMany({
      where: { confirmationTokenHash: tokenHash, confirmationExpiresAt: { gt: new Date() }, confirmedAt: null, unsubscribedAt: null },
      data: { confirmedAt: new Date(), confirmationTokenHash: null, confirmationExpiresAt: null },
    });
    if (!result.count) throw new NotFoundException('Ligação inválida ou expirada');
    return { success: true };
  }

  async unsubscribe(rawToken: string) {
    const result = await this.prisma.newsletterSubscription.deleteMany({ where: { unsubscribeTokenHash: digest(rawToken) } });
    if (!result.count) throw new NotFoundException('Ligação inválida ou já utilizada');
    return { success: true };
  }
}

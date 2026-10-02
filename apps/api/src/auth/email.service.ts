import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class EmailService {
  private async deliver(to: string, subject: string, text: string, html: string, replyTo?: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new ServiceUnavailableException('O envio de email não está configurado');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ from, to: [to], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!response.ok) throw new ServiceUnavailableException('Não foi possível enviar o email');
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const link = new URL('/redefinir-palavra-passe', siteUrl);
    link.searchParams.set('token', token);
    const safeName = name.replace(/[&<>"']/g, '');
    await this.deliver(email, 'Redefinir palavra-passe do AgendAI',
      `Olá ${name},\n\nPara escolher uma nova palavra-passe, abra esta ligação (válida durante 30 minutos):\n${link}\n\nSe não pediu esta alteração, ignore esta mensagem.`,
      `<p>Olá ${safeName},</p><p>Recebemos um pedido para redefinir a palavra-passe da sua conta AgendAI.</p><p><a href="${link.toString()}">Escolher nova palavra-passe</a></p><p>Esta ligação expira em 30 minutos. Se não pediu esta alteração, ignore esta mensagem.</p>`);
  }

  async sendInvitation(email: string, schoolName: string, role: string, token: string) {
    const link = new URL('/comecar', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    link.searchParams.set('convite', token);
    const safeSchool = schoolName.replace(/[&<>"']/g, '');
    await this.deliver(email, 'Convite para integrar uma escola no AgendAI',
      `Foi convidado para integrar ${schoolName} no AgendAI como ${role}. Aceite o convite nesta ligação, válida durante 7 dias: ${link}`,
      `<p>Foi convidado para integrar <strong>${safeSchool}</strong> no AgendAI como ${role}.</p><p><a href="${link.toString()}">Aceitar convite</a></p><p>Esta ligação é válida durante 7 dias.</p>`);
  }

  async sendVerification(email: string, name: string, token: string) {
    const link = new URL('/verificar-email', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    link.searchParams.set('token', token);
    const safeName = name.replace(/[&<>"']/g, '');
    await this.deliver(email, 'Confirme o seu email do AgendAI',
      `Olá ${name},\n\nConfirme o endereço de email da sua conta AgendAI nesta ligação, válida por 24 horas: ${link}`,
      `<p>Olá ${safeName},</p><p>Confirme o endereço de email da sua conta AgendAI.</p><p><a href="${link.toString()}">Confirmar email</a></p><p>Esta ligação é válida por 24 horas.</p>`);
  }

  async sendContact(input: { name: string; email: string; school: string; message: string; plan?: string }) {
    const to = process.env.CONTACT_EMAIL;
    if (!to) throw new ServiceUnavailableException('O canal de contacto não está configurado');
    const safe = (value: string) => value.replace(/[&<>"']/g, '');
    const text = `Nome: ${input.name}\nEmail: ${input.email}\nEscola: ${input.school || 'Não indicada'}\nPlano: ${input.plan || 'Não indicado'}\n\n${input.message}`;
    const html = `<h2>Novo contacto AgendAI</h2><p><strong>Nome:</strong> ${safe(input.name)}</p><p><strong>Email:</strong> ${safe(input.email)}</p><p><strong>Escola:</strong> ${safe(input.school || 'Não indicada')}</p><p><strong>Plano:</strong> ${safe(input.plan || 'Não indicado')}</p><p>${safe(input.message).replace(/\n/g, '<br>')}</p>`;
    await this.deliver(to, 'Novo contacto AgendAI', text, html, input.email);
  }

  async sendNewsletterConfirmation(email: string, token: string, unsubscribeToken: string) {
    const confirm = new URL('/newsletter/confirmar', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    confirm.searchParams.set('token', token);
    const unsubscribe = new URL('/newsletter/cancelar', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    unsubscribe.searchParams.set('token', unsubscribeToken);
    await this.deliver(email, 'Confirme a sua subscrição da newsletter AgendAI',
      `Confirme a subscrição da newsletter nesta ligação: ${confirm}\n\nPara retirar o consentimento, use: ${unsubscribe}`,
      `<p>Confirme a subscrição da newsletter AgendAI:</p><p><a href="${confirm.toString()}">Confirmar subscrição</a></p><p>Se não pediu esta subscrição, ignore esta mensagem. Para retirar o consentimento mais tarde, <a href="${unsubscribe.toString()}">cancele aqui</a>.</p>`);
  }
}

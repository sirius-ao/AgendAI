import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { emailButton, emailNotice, emailParagraph, escapeEmailHtml, renderBrandedEmail } from './email-templates.js';

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

  private get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const link = new URL('/redefinir-palavra-passe', this.siteUrl);
    link.searchParams.set('token', token);
    const text = `Olá ${name},\n\nRecebemos um pedido para redefinir a palavra-passe da sua conta AgendAKI.\n\nPara escolher uma nova palavra-passe, abra esta ligação (válida durante 30 minutos):\n${link}\n\nSe não pediu esta alteração, ignore esta mensagem.`;
    const content = [
      emailParagraph(`Olá ${escapeEmailHtml(name)},`),
      emailParagraph('Recebemos um pedido para redefinir a palavra-passe da sua conta AgendAKI.'),
      emailButton('Redefinir palavra-passe', link.toString()),
      emailNotice('<strong>Esta ligação é válida por 30 minutos.</strong> Se não pediu esta alteração, pode ignorar este email.'),
    ].join('');
    await this.deliver(email, 'Redefinir palavra-passe do AgendAKI', text,
      renderBrandedEmail({ siteUrl: this.siteUrl, preheader: 'Escolha uma nova palavra-passe para a sua conta.', title: 'Redefina a sua palavra-passe', content }));
  }

  async sendInvitation(email: string, schoolName: string, role: string, token: string) {
    const link = new URL('/comecar', this.siteUrl);
    link.searchParams.set('convite', token);
    const text = `Foi convidado para integrar ${schoolName} no AgendAKI como ${role}.\n\nAceite o convite nesta ligação, válida durante 7 dias:\n${link}`;
    const content = [
      emailParagraph(`Foi convidado para integrar <strong>${escapeEmailHtml(schoolName)}</strong> no AgendAKI.`),
      emailParagraph(`Perfil atribuído: <strong>${escapeEmailHtml(role)}</strong>.`),
      emailButton('Aceitar convite', link.toString()),
      emailNotice('Esta ligação para aceitar o convite é válida por <strong>7 dias</strong>.'),
    ].join('');
    await this.deliver(email, 'Convite para integrar uma escola no AgendAKI', text,
      renderBrandedEmail({ siteUrl: this.siteUrl, preheader: `Convite para integrar ${schoolName}.`, title: 'Tem um convite para entrar', content }));
  }

  async sendVerification(email: string, name: string, token: string) {
    const link = new URL('/verificar-email', this.siteUrl);
    link.searchParams.set('token', token);
    const text = `Olá ${name},\n\nConfirme o seu endereço de email para ativar a sua conta AgendAKI.\n\nConfirme nesta ligação, válida por 24 horas:\n${link}\n\nSe não criou uma conta, ignore este email. A conta não será ativada.`;
    const content = [
      emailParagraph(`Olá ${escapeEmailHtml(name)},`),
      emailParagraph('Confirme o seu endereço de email para ativar a sua conta AgendAKI.'),
      emailButton('Confirmar email', link.toString()),
      emailNotice('Esta ligação é válida por <strong>24 horas</strong>. Se não criou uma conta no AgendAKI, ignore este email; a conta não será ativada.'),
    ].join('');
    await this.deliver(email, 'Confirme o seu email no AgendAKI', text,
      renderBrandedEmail({ siteUrl: this.siteUrl, preheader: 'Confirme o seu endereço para ativar a sua conta AgendAKI.', title: 'Confirme o seu email', content }));
  }

  async sendWelcome(email: string, name: string) {
    const link = new URL('/entrar', this.siteUrl);
    const text = `Olá ${name},\n\nO seu endereço de email foi confirmado e a sua conta AgendAKI está ativa.\n\nEntre na sua conta para começar a organizar o seu trabalho: ${link}\n\nEstamos aqui para ajudar a planear hoje e ensinar melhor.`;
    const content = [
      emailParagraph(`Olá ${escapeEmailHtml(name)},`),
      emailParagraph('O seu endereço de email foi confirmado e a sua conta AgendAKI está ativa.'),
      emailParagraph('Pode agora entrar e começar a organizar o seu trabalho como professor.'),
      emailButton('Aceder à minha conta', link.toString()),
    ].join('');
    await this.deliver(email, 'Bem-vindo ao AgendAKI', text,
      renderBrandedEmail({ siteUrl: this.siteUrl, preheader: 'A sua conta está confirmada. Já pode começar a usar o AgendAKI.', title: 'Bem-vindo ao AgendAKI', content }));
  }

  async sendContact(input: { name: string; email: string; school: string; message: string; plan?: string }) {
    const to = process.env.CONTACT_EMAIL;
    if (!to) throw new ServiceUnavailableException('O canal de contacto não está configurado');
    const safe = escapeEmailHtml;
    const school = input.school || 'Não indicada';
    const plan = input.plan || 'Não indicado';
    const text = `Nome: ${input.name}\nEmail: ${input.email}\nEscola: ${school}\nPlano: ${plan}\n\n${input.message}`;
    const details = `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;"><tr><td style="padding:8px 0;color:#64716a;width:100px;">Nome</td><td style="padding:8px 0;color:#10251c;font-weight:bold;">${safe(input.name)}</td></tr><tr><td style="padding:8px 0;color:#64716a;border-top:1px solid #e7ece9;">Email</td><td style="padding:8px 0;color:#10251c;border-top:1px solid #e7ece9;">${safe(input.email)}</td></tr><tr><td style="padding:8px 0;color:#64716a;border-top:1px solid #e7ece9;">Escola</td><td style="padding:8px 0;color:#10251c;border-top:1px solid #e7ece9;">${safe(school)}</td></tr><tr><td style="padding:8px 0;color:#64716a;border-top:1px solid #e7ece9;">Plano</td><td style="padding:8px 0;color:#10251c;border-top:1px solid #e7ece9;">${safe(plan)}</td></tr></table>`;
    const message = emailNotice(`<strong>Mensagem</strong><br>${safe(input.message).replace(/\r?\n/g, '<br>')}`);
    const content = `${emailParagraph('Recebemos uma nova mensagem através do formulário do AgendAKI.')}${details}${message}`;
    const html = renderBrandedEmail({ siteUrl: this.siteUrl, preheader: 'Nova mensagem recebida através do formulário de contacto.', title: 'Novo pedido de contacto', content });
    await this.deliver(to, 'Novo contacto AgendAKI', text, html, input.email);
  }

  async sendNewsletterConfirmation(email: string, token: string, unsubscribeToken: string) {
    const confirm = new URL('/newsletter/confirmar', this.siteUrl);
    confirm.searchParams.set('token', token);
    const unsubscribe = new URL('/newsletter/cancelar', this.siteUrl);
    unsubscribe.searchParams.set('token', unsubscribeToken);
    const text = `Confirme a subscrição da newsletter AgendAKI nesta ligação:\n${confirm}\n\nSe não pediu esta subscrição, ignore este email. Para retirar o consentimento mais tarde, cancele aqui:\n${unsubscribe}`;
    const content = [
      emailParagraph('Recebemos um pedido para subscrever a newsletter do AgendAKI.'),
      emailParagraph('Confirme a sua inscrição para começar a receber novidades.'),
      emailButton('Confirmar subscrição', confirm.toString()),
      emailParagraph(`Se não pediu esta subscrição, ignore este email. Para retirar o consentimento mais tarde, <a href="${escapeEmailHtml(unsubscribe.toString())}" style="color:#245a40;">cancele a subscrição</a>.`),
    ].join('');
    await this.deliver(email, 'Confirme a sua subscrição da newsletter AgendAKI', text,
      renderBrandedEmail({ siteUrl: this.siteUrl, preheader: 'Confirme o seu pedido para receber novidades do AgendAKI.', title: 'Confirme a subscrição', content }));
  }
}

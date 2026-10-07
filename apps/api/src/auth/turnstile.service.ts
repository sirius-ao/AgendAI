import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

type TurnstileResponse = { success: boolean; action?: string; hostname?: string };

@Injectable()
export class TurnstileService {
  async verify(token: string | undefined, action: string, remoteIp?: string) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('A validação anti-robô não está configurada.');
      return;
    }
    if (!token) throw new BadRequestException('Confirme que não é um robô e tente novamente.');

    const allowedHosts = process.env.TURNSTILE_HOSTNAMES?.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
    if (process.env.NODE_ENV === 'production' && !allowedHosts?.length) {
      throw new ServiceUnavailableException('A lista de domínios Turnstile não está configurada.');
    }

    let result: TurnstileResponse;
    try {
      const body = new URLSearchParams({ secret, response: token });
      if (remoteIp) body.set('remoteip', remoteIp);
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Turnstile verification request failed');
      result = await response.json() as TurnstileResponse;
    } catch {
      throw new ServiceUnavailableException('Não foi possível validar o desafio. Tente novamente.');
    }

    if (!result.success || result.action !== action || (allowedHosts?.length && (!result.hostname || !allowedHosts.includes(result.hostname.toLowerCase())))) {
      throw new BadRequestException('A validação anti-robô falhou. Tente novamente.');
    }
  }
}

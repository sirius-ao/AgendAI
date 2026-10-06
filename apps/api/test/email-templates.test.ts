import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emailButton, escapeEmailHtml, renderBrandedEmail, resolveEmailSiteUrl } from '../src/auth/email-templates.js';

describe('AgendAKI email templates', () => {
  it('escapes user-controlled HTML characters', () => {
    assert.equal(escapeEmailHtml(`<teacher&'">`), '&lt;teacher&amp;&#39;&quot;&gt;');
  });

  it('escapes dynamic titles, preheaders and email links', () => {
    const email = renderBrandedEmail({
      siteUrl: 'https://agendaki.net/?a=1&b=2',
      preheader: '<Confirme>',
      title: 'Olá <docente>',
      content: emailButton('Confirmar & continuar', 'https://agendaki.net/verify?token=a&next=b'),
    });

    assert.match(email, /Olá &lt;docente&gt;/);
    assert.match(email, /&lt;Confirme&gt;/);
    assert.match(email, /https:\/\/agendaki\.net\/verify\?token=a&amp;next=b/);
    assert.match(email, /Confirmar &amp; continuar/);
    assert.doesNotMatch(email, /<docente>/);
  });

  it('uses the public HTTPS domain for production emails when Coolify still provides localhost', () => {
    assert.equal(resolveEmailSiteUrl('http://localhost:3000', true), 'https://www.agendaki.net');
    assert.equal(resolveEmailSiteUrl('http://[::1]:3000', true), 'https://www.agendaki.net');
    assert.equal(resolveEmailSiteUrl('http://agendaki.net', true), 'https://agendaki.net');
    assert.equal(resolveEmailSiteUrl(undefined, false), 'http://localhost:3000');
  });
});

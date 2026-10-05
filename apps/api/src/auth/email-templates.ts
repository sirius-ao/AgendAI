export interface EmailTemplateInput {
  siteUrl: string;
  preheader: string;
  title: string;
  content: string;
}

export function escapeEmailHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

export function emailParagraph(content: string) {
  return `<p style="margin:0 0 18px;color:#34413b;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">${content}</p>`;
}

export function emailButton(label: string, url: string) {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:26px 0 22px;"><tr><td align="center" bgcolor="#00bf63" style="border-radius:6px;"><a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1.2;text-decoration:none;">${escapeEmailHtml(label)}</a></td></tr></table>`;
}

export function emailNotice(content: string) {
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:22px 0 0;background:#f1f7f3;border-left:3px solid #00bf63;"><tr><td style="padding:13px 16px;color:#46544d;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">${content}</td></tr></table>`;
}

export function renderBrandedEmail({ siteUrl, preheader, title, content }: EmailTemplateInput) {
  const safeSiteUrl = escapeEmailHtml(siteUrl.replace(/\/$/, ''));
  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeEmailHtml(title)}</title>
    <style>@media only screen and (max-width:620px){.email-card{width:100%!important}.email-padding{padding-left:22px!important;padding-right:22px!important}}</style>
  </head>
  <body style="margin:0;padding:0;background:#f3f6f4;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(preheader)}</div>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f3f6f4;">
      <tr><td align="center" style="padding:28px 12px;">
        <table role="presentation" class="email-card" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5ebe7;border-radius:8px;overflow:hidden;">
          <tr><td class="email-padding" style="padding:20px 34px;background:#063b2b;">
            <a href="${safeSiteUrl}" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;letter-spacing:-.5px;text-decoration:none;">Agend<span style="color:#00e676;">AKI</span></a>
            <div style="padding-top:4px;color:#d0e4d9;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;">Planear hoje. Ensinar melhor.</div>
          </td></tr>
          <tr><td class="email-padding" style="padding:32px 34px 30px;">
            <h1 style="margin:0 0 22px;color:#10251c;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:1.25;font-weight:700;">${escapeEmailHtml(title)}</h1>
            ${content}
          </td></tr>
          <tr><td class="email-padding" style="padding:16px 34px;border-top:1px solid #e7ece9;color:#64716a;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
            <a href="${safeSiteUrl}" style="color:#245a40;text-decoration:underline;">agendaki.net</a><br>
            Este email foi enviado pelo AgendAKI.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

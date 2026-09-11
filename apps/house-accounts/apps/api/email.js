const COLORS = {
  navy: '#0E3E69',
  orange: '#FF6534',
  cream: '#FBF7EF',
  sand: '#F4EBDD',
  muted: '#365F86'
};

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const linkedLine = line => {
  const parts = String(line).split(/(https?:\/\/[^\s]+)/g);
  return parts.map(part => /^https?:\/\//.test(part)
    ? `<a href="${escapeHtml(part)}" style="color:${COLORS.orange};font-weight:700;text-decoration:underline;text-underline-offset:3px">${escapeHtml(part)}</a>`
    : escapeHtml(part)).join('');
};

const contentHtml = text => String(text).trim().split(/\n{2,}/).map(block => {
  const lines = block.split('\n').map(linkedLine).join('<br>');
  return `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:${COLORS.navy}">${lines}</p>`;
}).join('');

export function brandedEmailHtml({ subject, text, siteUrl, audience = 'customer' }) {
  const home = String(siteUrl || 'https://amazing-donuts.vercel.app').replace(/\/$/, '');
  const eyebrow = audience === 'owner' ? 'BAKERY NOTIFICATION' : 'FRESH FROM THE BAKERY';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.navy}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(subject)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.cream};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #E5DCCD;border-radius:8px;overflow:hidden">
        <tr><td style="background:${COLORS.navy};padding:26px 30px;border-bottom:8px solid ${COLORS.orange}">
          <a href="${escapeHtml(home)}" style="color:#ffffff;text-decoration:none;font-size:27px;line-height:1;font-weight:900">AMAZING DONUTS</a>
        </td></tr>
        <tr><td style="padding:32px 30px 16px">
          <div style="margin-bottom:10px;color:${COLORS.orange};font-size:12px;font-weight:800;letter-spacing:2px">${eyebrow}</div>
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;color:${COLORS.navy}">${escapeHtml(subject)}</h1>
          ${contentHtml(text)}
        </td></tr>
        <tr><td style="background:${COLORS.sand};padding:22px 30px;font-size:13px;line-height:1.55;color:${COLORS.muted}">
          Amazing Donuts · 3499 Bathurst Street, Toronto, Ontario<br>
          <a href="${escapeHtml(home)}" style="color:${COLORS.navy};font-weight:700">${escapeHtml(home.replace(/^https?:\/\//, ''))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function emailMessage(config, { to, subject, text, replyTo, audience = 'customer' }) {
  return {
    from: config.emailFrom,
    to,
    replyTo: replyTo || config.emailReplyTo,
    subject,
    text,
    html: brandedEmailHtml({ subject, text, siteUrl: config.siteUrl, audience })
  };
}

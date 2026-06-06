// Shared branded HTML email layout — Gmail-safe (critical styles inlined; single column).

export const BRAND = {
  purple: '#8D4087',
  lavender: '#F0E7F6',
  blue: '#1D45CF',
  green: '#317D34',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
}

export type ShellOpts = {
  preheader: string
  accent: string
  body: string
  logoUrl: string
  footerNote?: string
}

export function shell(opts: ShellOpts) {
  const year = new Date().getFullYear()
  const footerNote =
    opts.footerNote ??
    'This is an automated message from the Afrivate Monitoring &amp; Evaluation team at AfriVate Technologies Ltd.'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Afrivate M&amp;E</title>
</head>
<body style="margin:0;padding:0;width:100% !important;background-color:${BRAND.lavender};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:${BRAND.lavender};">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td align="center" style="padding:24px 20px 16px;border-bottom:1px solid ${BRAND.lavender};">
              <img src="${opts.logoUrl}" alt="Afrivate" width="160" style="display:block;width:100%;max-width:160px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;color:${BRAND.muted};text-align:center;">Monitoring &amp; Evaluation Platform</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background-color:${opts.accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.ink};">${opts.body}</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;background-color:#FAF7FC;border-top:1px solid ${BRAND.lavender};">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:${BRAND.muted};">${footerNote}</p>
              <p style="margin:0 0 12px;padding:10px 12px;background-color:#FFF8E6;border-left:3px solid #EFDA0E;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${BRAND.ink};">
                <strong>Please do not reply to this email.</strong> This inbox is not monitored.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:${BRAND.purple};">AfriVate Technologies Ltd.</p>
            </td>
          </tr>
        </table>
        <p style="margin:12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${BRAND.muted};text-align:center;">© ${year} AfriVate Technologies Ltd.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function button(link: string, label: string, color: string) {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:20px 0;">
    <tr>
      <td align="center" bgcolor="${color}" style="background-color:${color};border-radius:8px;">
        <a href="${link}" target="_blank" style="display:block;width:100%;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.3;color:#ffffff !important;text-decoration:none;text-align:center;border-radius:8px;box-sizing:border-box;">${label}</a>
      </td>
    </tr>
  </table>`
}

export function infoCard(rows: [string, string][]) {
  const cells = rows
    .map(
      ([k, v]) => `<tr>
        <td style="padding:12px 14px;border-bottom:1px solid #E8DCEC;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:10px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${k}</div>
          <div style="font-size:15px;color:${BRAND.ink};font-weight:bold;line-height:1.45;word-break:break-word;">${v}</div>
        </td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:${BRAND.lavender};border-radius:8px;margin:12px 0;">${cells}</table>`
}

export function fallbackLink(link: string) {
  return `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-word;">
    Button not working? Copy this link:<br>
    <a href="${link}" style="color:${BRAND.blue};word-break:break-all;">${link}</a></p>`
}

export function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:${BRAND.purple};line-height:1.35;">${text}</h1>`
}

export function p(text: string) {
  return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.ink};">${text}</p>`
}

export function authConfirmationUrl(
  supabaseUrl: string,
  emailData: { token_hash: string; email_action_type: string; redirect_to: string },
) {
  const base = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/verify`
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  })
  return `${base}?${params.toString()}`
}

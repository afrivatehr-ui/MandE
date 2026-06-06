// Shared branded HTML email layout for Afrivate M&E (survey + auth).
// Mobile-first: single column, fluid width, stacked info rows.

export const BRAND = {
  purple: '#8D4087',
  purpleDark: '#6E2F69',
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Afrivate M&amp;E</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; }
    .email-wrap { width: 100% !important; max-width: 600px !important; }
    .fluid { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .btn-td { border-radius: 10px; background-color: ${BRAND.purple}; }
    .btn-a {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 14px 20px !important;
      font-family: Poppins, Arial, sans-serif !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      line-height: 1.4 !important;
      text-align: center !important;
      text-decoration: none !important;
      color: #ffffff !important;
      border-radius: 10px !important;
    }
    @media only screen and (max-width: 620px) {
      .outer-pad { padding: 16px 10px !important; }
      .card-pad { padding: 20px 16px !important; }
      .header-pad { padding: 20px 16px !important; }
      .footer-pad { padding: 16px !important; }
      .h1-title { font-size: 20px !important; line-height: 1.35 !important; }
      .body-text { font-size: 14px !important; }
      .logo-img { width: 148px !important; max-width: 80% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.lavender};word-spacing:normal;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.lavender};min-width:100%;">
    <tr>
      <td align="center" class="outer-pad" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-wrap fluid" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td class="header-pad" align="center" style="padding:28px 24px 20px;background-color:#ffffff;border-bottom:1px solid ${BRAND.lavender};">
              <img src="${opts.logoUrl}" width="168" alt="Afrivate — AfriVate Technologies" class="logo-img fluid" style="display:block;margin:0 auto;width:168px;max-width:168px;height:auto;border:0;">
              <p style="margin:10px 0 0;font-family:Roboto,Arial,sans-serif;font-size:11px;line-height:1.4;color:${BRAND.muted};text-align:center;">Monitoring &amp; Evaluation Platform</p>
            </td>
          </tr>
          <tr><td style="height:4px;background-color:${opts.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td class="card-pad" style="padding:28px 24px;font-family:Roboto,Arial,sans-serif;color:${BRAND.ink};">${opts.body}</td>
          </tr>
          <tr>
            <td class="footer-pad" style="padding:18px 24px;background-color:#FAF7FC;border-top:1px solid ${BRAND.lavender};">
              <p style="margin:0 0 12px;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.65;color:${BRAND.muted};">${footerNote}</p>
              <p style="margin:0 0 12px;padding:10px 12px;background-color:#FFF8E6;border-left:3px solid #EFDA0E;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.ink};">
                <strong>Please do not reply to this email.</strong> This inbox is not monitored. For help, contact your Afrivate M&amp;E coordinator directly.
              </p>
              <p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:600;color:${BRAND.purple};">AfriVate Technologies Ltd.</p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-family:Roboto,Arial,sans-serif;font-size:11px;line-height:1.5;color:${BRAND.muted};max-width:600px;padding:0 8px;text-align:center;">
          © ${year} AfriVate Technologies Ltd.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function button(link: string, label: string, color: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
    <tr>
      <td align="center" class="btn-td" style="border-radius:10px;background-color:${color};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="${color}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${link}" class="btn-a" style="background-color:${color};">${label}</a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>`
}

export function infoCard(rows: [string, string][]) {
  const cells = rows
    .map(
      ([k, v]) => `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid rgba(141,64,135,0.12);">
          <div style="font-family:Roboto,Arial,sans-serif;font-size:11px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${k}</div>
          <div style="font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};font-weight:500;line-height:1.45;word-break:break-word;">${v}</div>
        </td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lavender};border-radius:12px;margin:12px 0 4px;overflow:hidden;">${cells}</table>`
}

export function fallbackLink(link: string) {
  return `<p class="body-text" style="margin:18px 0 0;font-family:Roboto,Arial,sans-serif;font-size:12px;color:${BRAND.muted};line-height:1.65;word-break:break-word;">
    Button not working? Copy and paste this link into your browser:<br>
    <a href="${link}" style="color:${BRAND.blue};word-break:break-all;">${link}</a></p>`
}

export function h1(text: string) {
  return `<h1 class="h1-title" style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;font-weight:600;color:${BRAND.purple};line-height:1.3;">${text}</h1>`
}

export function p(text: string) {
  return `<p class="body-text" style="margin:0 0 14px;font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7;">${text}</p>`
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

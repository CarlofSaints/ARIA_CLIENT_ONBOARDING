import { Resend } from "resend";
import fs from "fs";
import path from "path";

const FROM = "onboarding@outerjoin.co.za";

type WelcomeEmailParams = {
  clientName: string;
  camName: string;
  contactName: string;
  logoBase64?: string;
  recipients: string[];
};

function buildWelcomeHtml(params: WelcomeEmailParams, ariaLogoId: string, clientLogoId?: string): string {
  const { clientName, camName, contactName, logoBase64 } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to OuterJoin ARIA</title>
</head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
          <!-- Header -->
          <tr>
            <td style="background:#3D6273;padding:24px 32px;text-align:center;">
              <img src="cid:${ariaLogoId}" alt="ARIA" style="height:48px;width:auto;" />
            </td>
          </tr>
          ${logoBase64 ? `
          <!-- Client Logo -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;">
              <img src="cid:${clientLogoId}" alt="${clientName}" style="max-height:80px;max-width:200px;width:auto;" />
            </td>
          </tr>` : ""}
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#2D3748;">
              <h2 style="margin:0 0 16px;color:#3D6273;font-size:22px;">Welcome to OuterJoin ARIA</h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Dear ${contactName},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                We're excited to welcome <strong>${clientName}</strong> to the ARIA platform. Your account has been created and your dedicated Account Manager, <strong>${camName}</strong>, will be in touch shortly to guide you through the onboarding process.
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                ARIA — <em>Automated Retail Insights Assistant</em> — is OuterJoin's integrated platform for streamlined field operations, real-time reporting, and client collaboration.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                To complete your personnel setup, please use the link below:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#E04E2A;border-radius:6px;padding:12px 24px;">
                    <a href="[PLACEHOLDER: personnel collection link]" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;">Complete Personnel Setup</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">
                If you have any questions, feel free to reach out to ${camName} directly or reply to this email.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.6;">
                Welcome aboard!<br/>
                <strong>The OuterJoin Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F5F7F8;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:12px;color:#718096;">
                © ${new Date().getFullYear()} OuterJoin (Pty) Ltd · This email was sent to you as part of the ARIA client onboarding process.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  const resend = new Resend(apiKey);
  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);
  const ariaLogoId = "aria-logo";

  const attachments: { filename: string; content: Buffer; contentType: string; contentId: string }[] = [
    {
      filename: "aria-logo.png",
      content: ariaLogoData,
      contentType: "image/png",
      contentId: ariaLogoId,
    },
  ];

  let clientLogoId: string | undefined;
  if (params.logoBase64) {
    // data URL → strip prefix
    const match = params.logoBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      clientLogoId = "client-logo";
      attachments.push({
        filename: `client-logo.${mimeType.split("/")[1] || "png"}`,
        content: Buffer.from(base64Data, "base64"),
        contentType: mimeType,
        contentId: clientLogoId,
      });
    }
  }

  const html = buildWelcomeHtml(params, ariaLogoId, clientLogoId);

  await resend.emails.send({
    from: FROM,
    to: params.recipients,
    subject: `Welcome to OuterJoin ARIA — ${params.clientName}`,
    html,
    attachments,
  });
}

// ---------------------------------------------------------------------------
// User welcome email (sent when a new system user is created)
// ---------------------------------------------------------------------------

type UserWelcomeParams = {
  name: string;
  email: string;
  password: string;
  siteUrl?: string;
};

export async function sendUserWelcomeEmail(params: UserWelcomeParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping user welcome email");
    return;
  }
  const resend = new Resend(apiKey);
  const siteUrl = params.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "[SITE URL — add NEXT_PUBLIC_SITE_URL to .env.local]";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:24px 32px;">
            <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:bold;">OuterJoin ARIA</p>
            <p style="margin:4px 0 0;color:#9ecbd8;font-size:13px;">Client Onboarding Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#2D3748;">
            <p style="margin:0 0 16px;font-size:15px;">Hey ${params.name},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              Welcome to the OuterJoin ARIA client onboarding portal.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F5F7F8;border:1px solid #E2E8F0;border-radius:6px;width:100%;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#718096;">YOUR LOGIN DETAILS</p>
                  <p style="margin:0 0 6px;font-size:15px;"><strong>Username:</strong> ${params.email}</p>
                  <p style="margin:0 0 6px;font-size:15px;"><strong>Password:</strong> <code style="background:#fff;border:1px solid #E2E8F0;padding:2px 6px;border-radius:4px;">${params.password}</code></p>
                  <p style="margin:0;font-size:15px;"><strong>Portal:</strong> <a href="${siteUrl}" style="color:#3D6273;">${siteUrl}</a></p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              The entire client onboarding process from billing to control files is handled here!
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Remember that, at OuterJoin, we love good ideas, so if you have one that would improve this site, let us know!
            </p>
            <p style="margin:0;font-size:15px;">
              Thank you<br/>
              <strong>Team OJ</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F7F8;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#718096;">© ${new Date().getFullYear()} OuterJoin (Pty) Ltd</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: [params.email],
    subject: "Welcome to OuterJoin ARIA",
    html,
  });
}

// ---------------------------------------------------------------------------
// Admin notification — new user's first login
// ---------------------------------------------------------------------------

type FirstLoginParams = {
  userName: string;
  userEmail: string;
  loginAt: string;
  adminEmails: string[];
};

export async function sendAdminFirstLoginNotification(params: FirstLoginParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || params.adminEmails.length === 0) return;
  const resend = new Resend(apiKey);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:20px 32px;">
            <p style="margin:0;color:#FFFFFF;font-size:17px;font-weight:bold;">ARIA — New User First Login</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;color:#2D3748;">
            <p style="margin:0 0 12px;font-size:15px;">
              <strong>${params.userName}</strong> (<a href="mailto:${params.userEmail}" style="color:#3D6273;">${params.userEmail}</a>) has logged into ARIA for the first time.
            </p>
            <p style="margin:0;font-size:14px;color:#718096;">
              First login: ${new Date(params.loginAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "full", timeStyle: "short" })}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: params.adminEmails,
    subject: `ARIA: First login — ${params.userName}`,
    html,
  });
}

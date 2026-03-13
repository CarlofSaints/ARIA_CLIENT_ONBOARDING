import { Resend } from "resend";
import fs from "fs";
import path from "path";

const FROM = "onboarding@outerjoin.co.za";

type WelcomeEmailParams = {
  clientName: string;
  camName: string;
  camEmail: string;
  contactName: string;
  logoBase64?: string;
  recipients: string[];
  personnelFormUrl?: string;
  cognitoFormUrl?: string;
};

function buildWelcomeHtml(params: WelcomeEmailParams, ariaLogoId: string, clientLogoId?: string): string {
  const { clientName, camName, camEmail, contactName, logoBase64, cognitoFormUrl } = params;

  const cognitoBlock = cognitoFormUrl ? `
          <!-- Cognito billing & contracts icon link -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D3748;">
                To get started with your billing and contracts, please complete the form below:
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${cognitoFormUrl}" title="Billing &amp; Contracts Form" style="text-decoration:none;display:inline-block;text-align:center;border:2px solid #3D6273;border-radius:10px;padding:14px 20px;background:#F5F7F8;min-width:100px;">
                      <span style="font-size:30px;display:block;line-height:1;margin-bottom:6px;">📋</span>
                      <span style="font-size:12px;color:#3D6273;font-weight:bold;letter-spacing:0.3px;display:block;">Billing &amp; Contracts</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : "";

  const personnelBlock = "";

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
              <img src="cid:${ariaLogoId}" alt="ARIA" width="10" height="10" style="height:10px;width:auto;" />
            </td>
          </tr>
          ${logoBase64 ? `
          <!-- Client Logo -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;">
              <img src="cid:${clientLogoId}" alt="${clientName}" style="max-height:16px;max-width:40px;width:auto;" />
            </td>
          </tr>` : ""}
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 16px;color:#2D3748;">
              <h2 style="margin:0 0 16px;color:#3D6273;font-size:22px;">Welcome to OuterJoin ARIA</h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Dear ${contactName},</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                We're excited to welcome <strong>${clientName}</strong> to the ARIA platform. Your account has been created and your Account Manager, <strong>${camName}</strong>, will be in touch shortly to guide you through the onboarding process.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                ARIA — <em>Automated Retail Insights Assistant</em> — is OuterJoin's integrated platform for streamlined retail data analytics, real-time reporting, and client collaboration.
              </p>
              ${personnelBlock}
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">
                If you have any questions, feel free to reach out to ${camName} (${camEmail}) directly or reply to this email.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.6;">
                Welcome aboard!<br/>
                <strong>The OuterJoin Team</strong>
              </p>
            </td>
          </tr>
          ${cognitoBlock}
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

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    subject: `Welcome to OuterJoin ARIA — ${params.clientName}`,
    html,
    attachments,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
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
  const siteUrl = params.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://aria-onboarding-two.vercel.app";

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <tr>
          <td style="background:#3D6273;padding:24px 32px;text-align:center;">
            <img src="cid:aria-logo-welcome" alt="ARIA" width="40" height="40" style="height:40px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 16px;color:#2D3748;">
            <h2 style="margin:0 0 16px;color:#3D6273;font-size:20px;">Welcome to OuterJoin ARIA</h2>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hey ${params.name},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
              Your ARIA account is ready. Use the login details below to access the portal.
            </p>
            <!-- Credentials box -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F5F7F8;border:1px solid #E2E8F0;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:0.08em;color:#718096;text-transform:uppercase;">Your login details</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#2D3748;"><span style="color:#718096;display:inline-block;min-width:80px;">Username</span>${params.email}</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#2D3748;"><span style="color:#718096;display:inline-block;min-width:80px;">Password</span><code style="background:#FFFFFF;border:1px solid #E2E8F0;padding:2px 8px;border-radius:4px;font-size:14px;">${params.password}</code></p>
                </td>
              </tr>
            </table>
            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#3D6273;border-radius:8px;padding:14px 28px;">
                  <a href="${siteUrl}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;display:block;">Open ARIA Portal →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              The entire client onboarding process — from billing to control files — is handled here.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              If you have ideas that could improve the portal, we'd love to hear them!
            </p>
            <p style="margin:0;font-size:15px;">
              Thank you,<br/>
              <strong>Team OJ</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
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

  const { error: err1 } = await resend.emails.send({
    from: FROM,
    to: [params.email],
    subject: "Welcome to OuterJoin ARIA — your account is ready",
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo-welcome" },
    ],
  });
  if (err1) throw new Error(`Resend error: ${err1.message}`);
}

// ---------------------------------------------------------------------------
// User account notification email (no password — for existing users)
// ---------------------------------------------------------------------------

type UserNotificationParams = {
  name: string;
  email: string;
  siteUrl?: string;
};

export async function sendUserNotificationEmail(params: UserNotificationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping user notification email");
    return;
  }
  const resend = new Resend(apiKey);
  const siteUrl = params.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://aria-onboarding-two.vercel.app";

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <tr>
          <td style="background:#3D6273;padding:24px 32px;text-align:center;">
            <img src="cid:aria-logo-notify" alt="ARIA" width="40" height="40" style="height:40px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 16px;color:#2D3748;">
            <h2 style="margin:0 0 16px;color:#3D6273;font-size:20px;">Your ARIA account is ready</h2>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${params.name},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
              You have an active account on the OuterJoin ARIA client onboarding portal.
              Log in with your email address below.
            </p>
            <!-- Credentials box -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F5F7F8;border:1px solid #E2E8F0;border-radius:8px;width:100%;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:0.08em;color:#718096;text-transform:uppercase;">Your login</p>
                  <p style="margin:0;font-size:14px;color:#2D3748;"><span style="color:#718096;display:inline-block;min-width:80px;">Username</span>${params.email}</p>
                </td>
              </tr>
            </table>
            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#3D6273;border-radius:8px;padding:14px 28px;">
                  <a href="${siteUrl}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;display:block;">Open ARIA Portal →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#718096;">
              If you've forgotten your password, please contact your administrator.
            </p>
            <p style="margin:0;font-size:15px;">
              Thank you,<br/>
              <strong>Team OJ</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
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

  const { error } = await resend.emails.send({
    from: FROM,
    to: [params.email],
    subject: "ARIA — your account details",
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo-notify" },
    ],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Personnel CAM notification
// ---------------------------------------------------------------------------

type PersonnelCamParams = {
  camName: string;
  camEmail: string;
  clientName: string;
  rowCount: number;
  spUrl?: string;
  excelBuffer: Buffer;
  fileName: string;
};

export async function sendPersonnelCamEmail(params: PersonnelCamParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn("RESEND_API_KEY not set — skipping personnel CAM email"); return; }
  const resend = new Resend(apiKey);

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const spButton = params.spUrl
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#3D6273;border-radius:6px;padding:12px 24px;">
            <a href="${params.spUrl}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;">View in SharePoint →</a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:24px 32px;text-align:center;">
            <img src="cid:aria-logo" alt="ARIA" width="10" height="10" style="height:10px;width:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#2D3748;">
            <h2 style="margin:0 0 16px;color:#3D6273;font-size:20px;">Personnel File Received</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hi ${params.camName},</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              <strong>${params.clientName}</strong> has submitted their personnel form.
              The file contains <strong>${params.rowCount} ${params.rowCount === 1 ? "person" : "people"}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              The Excel file is attached to this email${params.spUrl ? " and has been uploaded to SharePoint" : ""}.
            </p>
            ${spButton}
            <p style="margin:0;font-size:14px;color:#718096;">
              This is an automated notification from ARIA.
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

  const { error: err2 } = await resend.emails.send({
    from: FROM,
    to: [params.camEmail],
    subject: `ARIA: Personnel file received — ${params.clientName}`,
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo" },
      { filename: params.fileName, content: params.excelBuffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    ],
  });
  if (err2) throw new Error(`Resend error: ${err2.message}`);
}

// ---------------------------------------------------------------------------
// Personnel client confirmation
// ---------------------------------------------------------------------------

type PersonnelClientParams = {
  clientName: string;
  recipients: string[];
  excelBuffer: Buffer;
  fileName: string;
};

export async function sendPersonnelClientEmail(params: PersonnelClientParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || params.recipients.length === 0) { console.warn("RESEND_API_KEY not set or no recipients — skipping personnel client email"); return; }
  const resend = new Resend(apiKey);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:24px 32px;">
            <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:bold;">OuterJoin ARIA</p>
            <p style="margin:4px 0 0;color:#9ecbd8;font-size:13px;">Client Onboarding Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#2D3748;">
            <h2 style="margin:0 0 16px;color:#3D6273;font-size:20px;">Thank you — Personnel information received</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              Thank you for completing the personnel form for <strong>${params.clientName}</strong>.
            </p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              Your response has been received and saved. A copy of the information submitted is attached for your records.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Your dedicated Account Manager will be in touch if any follow-up is needed.
            </p>
            <p style="margin:0;font-size:15px;">
              Thank you,<br/>
              <strong>The OuterJoin Team</strong>
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

  const { error: err3 } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    subject: `Thank you — Personnel information received`,
    html,
    attachments: [
      { filename: params.fileName, content: params.excelBuffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    ],
  });
  if (err3) throw new Error(`Resend error: ${err3.message}`);
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

  const { error: err4 } = await resend.emails.send({
    from: FROM,
    to: params.adminEmails,
    subject: `ARIA: First login — ${params.userName}`,
    html,
  });
  if (err4) throw new Error(`Resend error: ${err4.message}`);
}

// ---------------------------------------------------------------------------
// Personnel form invite — sent to client when the CAM generates the link
// ---------------------------------------------------------------------------

type PersonnelInviteParams = {
  contactName: string;
  camName: string;
  camEmail: string;
  clientName: string;
  formUrl: string;
  recipients: string[];
  customBody?: string;
  customSubject?: string;
};

export async function sendPersonnelInviteEmail(params: PersonnelInviteParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || params.recipients.length === 0) {
    console.warn("RESEND_API_KEY not set or no recipients — skipping personnel invite email");
    return;
  }
  const resend = new Resend(apiKey);

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ojLogoPath = path.join(process.cwd(), "public", "oj-logo.jpg");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);
  const ojLogoData = fs.readFileSync(ojLogoPath);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">

        <!-- Header -->
        <tr>
          <td style="background:#3D6273;padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><img src="cid:aria-logo" alt="ARIA" width="40" height="40" style="height:40px;width:40px;display:block;" /></td>
                <td align="right"><img src="cid:oj-logo" alt="OuterJoin" width="80" height="28" style="height:28px;width:80px;display:block;border-radius:2px;" /></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 8px;color:#2D3748;">
            ${params.customBody
              ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${params.customBody.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>`
              : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Good day ${params.contactName},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              My name is <strong>${params.camName}</strong> and I am your Account Manager (CAM) at OuterJoin.
            </p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              I am responsible for your onboarding process and the administration of your account.
              I will also assist with ad hoc reporting as and when you need it.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              For now, I would like to get to know your team so I know how to direct my communication.
              Could you please fill in the form at the link below:
            </p>`
            }
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:0 32px 28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#3D6273;border-radius:8px;padding:14px 28px;">
                  <a href="${params.formUrl}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;display:block;">
                    Complete Personnel Form →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Next steps -->
        <tr>
          <td style="padding:0 32px 28px;color:#2D3748;">
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              Once I have these details, I will reach out to discuss the next steps, which include:
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-left:3px solid #3D6273;margin:0 0 24px;">
              <tr><td style="padding:4px 0 4px 16px;font-size:15px;line-height:1.7;color:#2D3748;">
                Data acquisition — which differs per channel
              </td></tr>
              <tr><td style="padding:4px 0 4px 16px;font-size:15px;line-height:1.7;color:#2D3748;">
                Control file creation — once we start receiving data, I will build the first draft of the control files and reach out to schedule a review meeting
              </td></tr>
              <tr><td style="padding:4px 0 4px 16px;font-size:15px;line-height:1.7;color:#2D3748;">
                Dashboard training
              </td></tr>
              <tr><td style="padding:4px 0 4px 16px;font-size:15px;line-height:1.7;color:#2D3748;">
                Ad hoc and scheduled reporting workshop
              </td></tr>
            </table>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Looking forward to growing your sales!</p>
            <p style="margin:0;font-size:15px;line-height:1.6;">
              Thank you,<br/>
              <strong>${params.camName}</strong><br/>
              <a href="mailto:${params.camEmail}" style="color:#3D6273;font-size:13px;">${params.camEmail}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F7F8;padding:16px 32px;border-top:1px solid #E2E8F0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="cid:oj-logo" alt="OuterJoin" width="57" height="20" style="height:20px;width:57px;display:block;border-radius:2px;" />
                </td>
                <td align="right">
                  <p style="margin:0;font-size:12px;color:#718096;">© ${new Date().getFullYear()} OuterJoin (Pty) Ltd</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    replyTo: params.camEmail,
    subject: params.customSubject ?? `Personnel Information Form — ${params.clientName}`,
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo" },
      { filename: "oj-logo.jpg", content: ojLogoData, contentType: "image/jpeg", contentId: "oj-logo" },
    ],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// NDA email — sends filled NDA .docx to client
// ---------------------------------------------------------------------------

type NdaEmailParams = {
  clientName: string;
  contactName: string;
  camName: string;
  recipients: string[];
  ndaBuffer: Buffer;
  ndaFileName: string;
};

export async function sendNdaEmail(params: NdaEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(apiKey);

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:20px 32px;text-align:center;">
            <img src="cid:aria-logo-nda" alt="ARIA" style="height:24px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;color:#2D3748;">
            <h2 style="margin:0 0 16px;color:#3D6273;font-size:20px;">Non-Disclosure Agreement</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Dear ${params.contactName},</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
              Please find attached the Non-Disclosure Agreement for <strong>${params.clientName}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Kindly review, sign, and return the signed copy to your Account Manager, <strong>${params.camName}</strong>.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.6;">
              Thank you,<br/>
              <strong>The OuterJoin Team</strong>
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

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    subject: `Non-Disclosure Agreement — ${params.clientName}`,
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo-nda" },
      { filename: params.ndaFileName, content: params.ndaBuffer, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Control file sign-off email — requests client sign-off via Cognito form
// ---------------------------------------------------------------------------

type SignOffEmailParams = {
  camName: string;
  camEmail: string;
  recipients: string[];
  cc?: string[];
  clientName: string;
  customBody?: string;
  customSubject?: string;
};

const SIGNOFF_FORM_URL = "https://www.cognitoforms.com/OuterJoin1/ARIAMasterfileSignOffOUTERJOIN";

export async function sendControlFileSignOffEmail(params: SignOffEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || params.recipients.length === 0) {
    console.warn("RESEND_API_KEY not set or no recipients — skipping sign-off email");
    return;
  }
  const resend = new Resend(apiKey);

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const bodyText = params.customBody ?? `Your control files are complete but we require sign-off from you.\n\nPlease can you fill in the form found at this link — ${SIGNOFF_FORM_URL}\n\nYou can sign off a single channel and single control at a time or you can sign off multiple control files and channels at once.\n\nIf you are not responsible for a channel/principal/brand, please do not sign them off.\n\nIf you have any questions, please do not hesitate to reach out.\n\nThank you\n${params.camName}`;

  const bodyHtml = bodyText
    .split("\n")
    .map((line) =>
      line.trim() === ""
        ? `<tr><td style="padding:6px 0;"></td></tr>`
        : `<tr><td style="font-size:15px;line-height:1.7;color:#2D3748;">${line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(SIGNOFF_FORM_URL, `<a href="${SIGNOFF_FORM_URL}" style="color:#3D6273;font-weight:600;">${SIGNOFF_FORM_URL}</a>`)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <!-- Header -->
        <tr>
          <td style="background:#3D6273;padding:18px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><img src="cid:aria-logo-signoff" alt="ARIA" style="height:22px;width:auto;display:block;" /></td>
                <td align="right" style="font-size:12px;color:#9ecbd8;letter-spacing:0.3px;">OuterJoin ARIA</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${bodyHtml}
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F5F7F8;padding:16px 32px;border-top:1px solid #E2E8F0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#718096;">© ${new Date().getFullYear()} OuterJoin (Pty) Ltd</td>
                <td align="right" style="font-size:12px;color:#718096;">
                  <a href="mailto:${params.camEmail}" style="color:#3D6273;text-decoration:none;">${params.camEmail}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    ...(params.cc && params.cc.length > 0 ? { cc: params.cc } : {}),
    replyTo: params.camEmail,
    subject: params.customSubject ?? `Control File Sign-off Required — ${params.clientName}`,
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo-signoff" },
    ],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// CAM new client notification
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mandate email — sends channel mandate letter (.docx) to client
// ---------------------------------------------------------------------------

type MandateEmailParams = {
  clientName: string;
  contactName: string;
  recipients: string[];
  subject: string;
  body: string;
  mandateFileName: string;
  mandateBase64: string; // data URL: "data:application/...;base64,..."
};

export async function sendMandateEmail(params: MandateEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(apiKey);

  // Strip data URL prefix to get raw base64
  const match = params.mandateBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid mandateBase64 data URL");
  const mimeType = match[1];
  const base64Data = match[2];

  const bodyHtml = params.body
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${line}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:24px 32px;text-align:center;">
            <img src="cid:aria-logo" alt="ARIA" width="10" height="10" style="height:10px;width:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#2D3748;">
            ${bodyHtml}
            <p style="margin:16px 0 0;font-size:14px;color:#718096;">
              Please find the mandate letter attached to this email.
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

  const ariaLogoPath = path.join(process.cwd(), "public", "aria-logo.png");
  const ariaLogoData = fs.readFileSync(ariaLogoPath);

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.recipients,
    subject: params.subject,
    html,
    attachments: [
      { filename: "aria-logo.png", content: ariaLogoData, contentType: "image/png", contentId: "aria-logo" },
      { filename: params.mandateFileName, content: Buffer.from(base64Data, "base64"), contentType: mimeType },
    ],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------

type CamNewClientParams = {
  camName: string;
  camEmail: string;
  clientName: string;
  channels: string[];
  portalUrl: string;
};

export async function sendCamNewClientEmail(params: CamNewClientParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn("RESEND_API_KEY not set — skipping CAM notification email"); return; }
  const resend = new Resend(apiKey);

  const channelList = params.channels.map((ch) => `<li style="margin:0 0 4px;font-size:15px;color:#2D3748;">${ch}</li>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#3D6273;padding:24px 32px;">
            <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:bold;">OuterJoin ARIA</p>
            <p style="margin:4px 0 0;color:#9ecbd8;font-size:13px;">Client Onboarding Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#2D3748;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Dear ${params.camName},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              Please note that you have a new account — <strong>${params.clientName}</strong>.
            </p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">They have signed up for the following channels:</p>
            <ul style="margin:0 0 24px;padding-left:20px;">
              ${channelList}
            </ul>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              The client has already been informed that you are their Account Manager.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Please login to the Onboarding Portal and send the personnel docs, set up Teams and SharePoint.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#3D6273;border-radius:6px;padding:12px 24px;">
                  <a href="${params.portalUrl}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:bold;">Open Onboarding Portal →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:15px;line-height:1.6;">Thank you</p>
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

  const { error: errCam } = await resend.emails.send({
    from: FROM,
    to: [params.camEmail],
    subject: `ARIA: New client assigned — ${params.clientName}`,
    html,
  });
  if (errCam) throw new Error(`Resend error: ${errCam.message}`);
}

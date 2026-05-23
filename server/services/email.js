import { Resend } from 'resend';

const API_KEY = process.env.RESEND_API_KEY;
const resend = API_KEY ? new Resend(API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Andromeda <noreply@andromeda.gg>';
const DEMO = process.env.EMAIL_DEMO_MODE === 'true';

// ── HTML email templates ────────────────────────────────────────────────────

function verificationEmail(code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#03030a;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;
        background:linear-gradient(135deg,#8B5CF6,#06B6D4);
        line-height:56px;font-size:28px;color:#fff;font-weight:bold;margin-bottom:20px;">A</div>
      <h1 style="color:#F0F0FF;font-size:24px;font-weight:700;margin:0 0 8px;">Verify your Andromeda account</h1>
      <p style="color:rgba(200,200,255,.7);font-size:14px;margin:0;">Enter this code to activate your account:</p>
    </div>

    <!-- Code box -->
    <div style="background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.3);
      border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;font-weight:800;letter-spacing:12px;
        font-family:ui-monospace,Consolas,monospace;
        color:#F0F0FF;text-shadow:0 0 20px rgba(139,92,246,.6);">${code}</div>
      <p style="color:rgba(200,200,255,.5);font-size:12px;margin:16px 0 0;">
        Expires in <strong style="color:#8B5CF6">10 minutes</strong>
      </p>
    </div>

    <!-- Security note -->
    <div style="background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);
      border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:rgba(200,200,255,.6);font-size:12px;margin:0;line-height:1.6;">
        ⚠️ If you didn't create an Andromeda account, ignore this email.
        This code was requested by you and is valid for this email address only.
      </p>
    </div>

    <!-- Footer -->
    <p style="color:rgba(150,150,200,.4);font-size:11px;text-align:center;margin:0;">
      Andromeda · Deepwoken Script · Since 2024<br/>
      This is an automated message. Do not reply.
    </p>
  </div>
</body>
</html>`;
}

function resetPasswordEmail(code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#03030a;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;
        background:linear-gradient(135deg,#8B5CF6,#06B6D4);
        line-height:56px;font-size:28px;color:#fff;font-weight:bold;margin-bottom:20px;">A</div>
      <h1 style="color:#F0F0FF;font-size:24px;font-weight:700;margin:0 0 8px;">Reset your Andromeda password</h1>
      <p style="color:rgba(200,200,255,.7);font-size:14px;margin:0;">Use this code to set a new password:</p>
    </div>

    <!-- Code box -->
    <div style="background:rgba(236,72,153,.12);border:1px solid rgba(236,72,153,.3);
      border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;font-weight:800;letter-spacing:12px;
        font-family:ui-monospace,Consolas,monospace;
        color:#F0F0FF;text-shadow:0 0 20px rgba(236,72,153,.6);">${code}</div>
      <p style="color:rgba(200,200,255,.5);font-size:12px;margin:16px 0 0;">
        Expires in <strong style="color:#EC4899">10 minutes</strong>
      </p>
    </div>

    <!-- Security warning -->
    <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
      border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:rgba(200,200,255,.6);font-size:12px;margin:0;line-height:1.6;">
        🔒 Security notice: If you didn't request a password reset, your account is secure.
        No changes have been made yet. You can safely ignore this email.
        <strong style="color:#EF4444">Do not share this code with anyone.</strong>
      </p>
    </div>

    <!-- Footer -->
    <p style="color:rgba(150,150,200,.4);font-size:11px;text-align:center;margin:0;">
      Andromeda · Deepwoken Script · Since 2024<br/>
      This is an automated message. Do not reply.
    </p>
  </div>
</body>
</html>`;
}

// ── Send functions ──────────────────────────────────────────────────────────

export async function sendVerificationEmail(email, code) {
  if (!API_KEY || DEMO) {
    console.log('\n📧 [DEMO] Verification email to:', email);
    console.log('   Code:', code, '(expires in 10 minutes)\n');
    return { success: true, demo: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Verify your Andromeda account',
      html: verificationEmail(code),
    });
    if (error) throw new Error(error.message);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Resend error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendResetPasswordEmail(email, code) {
  if (!API_KEY || DEMO) {
    console.log('\n📧 [DEMO] Password reset email to:', email);
    console.log('   Code:', code, '(expires in 10 minutes)\n');
    return { success: true, demo: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Reset your Andromeda password',
      html: resetPasswordEmail(code),
    });
    if (error) throw new Error(error.message);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Resend error:', err.message);
    return { success: false, error: err.message };
  }
}

// ── VerificationCode model (in-memory for simplicity, could be MongoDB collection) ──

const verificationCodes = new Map();
// Key: `${email}:${type}`, Value: { code, expires, used, resendCount, lastResend }

export const VerificationCode = {
  set(email, type, code) {
    const key = `${email}:${type}`;
    verificationCodes.set(key, {
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
      resendCount: 0,
      lastResend: null,
    });
  },

  get(email, type) {
    return verificationCodes.get(`${email}:${type}`) || null;
  },

  markUsed(email, type) {
    const key = `${email}:${type}`;
    const entry = verificationCodes.get(key);
    if (entry) entry.used = true;
  },

  incrementResend(email, type) {
    const key = `${email}:${type}`;
    const entry = verificationCodes.get(key);
    if (entry) {
      entry.resendCount++;
      entry.lastResend = Date.now();
      entry.code = Math.floor(100000 + Math.random() * 900000).toString();
      entry.expires = Date.now() + 10 * 60 * 1000;
      entry.used = false;
    }
    return entry;
  },

  canResend(email, type) {
    const entry = verificationCodes.get(`${email}:${type}`);
    if (!entry) return true;
    if (entry.resendCount >= 3) return false;
    // Allow resend if last attempt was more than 2 minutes ago
    if (entry.lastResend && Date.now() - entry.lastResend < 2 * 60 * 1000) return false;
    return true;
  },

  delete(email, type) {
    verificationCodes.delete(`${email}:${type}`);
  },
};
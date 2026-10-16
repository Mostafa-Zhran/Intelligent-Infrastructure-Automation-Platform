const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const resendClient = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const transporter = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
    : null;

function getEmailHtml(resetUrl) {
    return `
    <div style="background-color:#07070D;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;color:#ffffff;padding:40px 20px;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
        <div style="text-align:center;margin-bottom:30px;">
            <div style="display:inline-block;padding:12px 24px;border-radius:24px;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.2));border:1px solid rgba(139,92,246,0.3);color:#A78BFA;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                Intelligent Infrastructure Automation
            </div>
            <h1 style="color:#ffffff;font-size:24px;margin-top:20px;font-weight:700;">Password Reset Request</h1>
            <p style="color:#94A3B8;font-size:14px;line-height:1.6;">
                We received a request to securely reset your credentials for the Intelligent Platform. Click the button below to choose a new password:
            </p>
        </div>
        <div style="text-align:center;margin:35px 0;">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#ffffff;padding:14px 32px;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;display:inline-block;box-shadow:0 10px 25px -5px rgba(124,58,237,0.5);">
                Reset Password
            </a>
        </div>
        <p style="color:#64748B;font-size:12px;text-align:center;line-height:1.5;">
            This link is valid for 15 minutes. If you did not request this password reset, please ignore this email or contact security.
        </p>
        <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:30px;padding-top:20px;text-align:center;color:#475569;font-size:11px;">
            Intelligent Infrastructure Automation Platform &bull; Automated DevOps
        </div>
    </div>
    `;
}

async function sendPasswordResetEmail(email, resetUrl) {
    const htmlContent = getEmailHtml(resetUrl);
    const textContent = `Use this link to reset your password: ${resetUrl}\n\nIf you did not request this, ignore this email.`;

    // 1. Try Resend if API Key is configured (Preferred Modern Production Option)
    if (process.env.RESEND_API_KEY) {
        const client = resendClient || new Resend(process.env.RESEND_API_KEY);
        const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev';

        console.log(`[Resend] Sending password reset email to ${email}...`);
        const { data, error } = await client.emails.send({
            from: fromAddress,
            to: email,
            subject: 'Reset your password | Automated DevOps Platform',
            html: htmlContent,
            text: textContent,
        });

        if (error) {
            console.error('[Resend Error]:', error);
            throw new Error(`Resend Error: ${error.message}`);
        }

        console.log('[Resend Success]:', data);
        return data;
    }

    // 2. Try SMTP if configured
    if (transporter) {
        console.log(`[SMTP] Sending password reset email to ${email}...`);
        return transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Reset your password | Automated DevOps Platform',
            text: textContent,
            html: htmlContent,
        });
    }

    // 3. Dev Fallback: Print cleanly to console
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 [DEV EMAIL SIMULATION] Password Reset Link:');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { messageId: 'dev-console-email' };
}

module.exports = { sendPasswordResetEmail };

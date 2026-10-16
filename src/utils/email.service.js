const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter configured for Gmail / SMTP.
 */
function getTransporter() {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (!user || !pass) {
        return null;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);

    // If using Gmail (either explicit service or smtp.gmail.com host)
    if (host.includes('gmail') || process.env.SMTP_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass, // Google App Password (16 characters)
            },
        });
    }

    // Generic SMTP configuration
    return nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE !== undefined
            ? process.env.SMTP_SECURE === 'true'
            : port === 465,
        auth: {
            user,
            pass,
        },
    });
}

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

    const transporter = getTransporter();

    // 1. Try Gmail / SMTP if configured (Priority)
    if (transporter) {
        const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
        const fromAddress = process.env.SMTP_FROM || `"Intelligent Platform" <${smtpUser}>`;

        console.log(`[Gmail/SMTP] Sending password reset email to ${email}...`);
        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: 'Reset your password | Automated DevOps Platform',
                text: textContent,
                html: htmlContent,
            });

            console.log('[Gmail/SMTP Success]: Message ID', info.messageId);
            return info;
        } catch (error) {
            console.error('[Gmail/SMTP Error]:', error.message);
            throw new Error(`Gmail/SMTP Error: ${error.message}`);
        }
    }

    // 2. Fallback to Resend if configured
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = require('resend');
            const client = new Resend(process.env.RESEND_API_KEY);
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
        } catch (err) {
            console.error('[Resend Execution Error]:', err.message);
            throw err;
        }
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


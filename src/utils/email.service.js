const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendPasswordResetEmail(email, resetUrl) {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
    ) {
        throw new Error('SMTP configuration is incomplete');
    }

    return transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Reset your password',
        text: `Use this link to reset your password: ${resetUrl}\n\nIf you did not request this, ignore this email.`,
        html: `
            <p>You requested to reset your password.</p>
            <p><a href="${resetUrl}">Reset password</a></p>
            <p>If you did not request this, ignore this email.</p>
        `,
    });
}

module.exports = { sendPasswordResetEmail };


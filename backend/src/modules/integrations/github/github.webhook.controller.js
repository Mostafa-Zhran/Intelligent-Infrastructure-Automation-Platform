// backend/src/modules/integrations/github/github.webhook.controller.js
// Express handler for POST /api/webhooks/github
const asyncHandler = require('../../../utils/asyncHandler');
const webhookService = require('./github.webhook.service');

/**
 * Receives and processes GitHub webhook events.
 * - Verifies HMAC-SHA256 signature using GITHUB_WEBHOOK_SECRET
 * - Handles: push, ping
 * - Ignores: other events (returns 200 immediately)
 *
 * Raw body buffering is configured via express.json({ verify }) in app.js.
 */
const handleGithubWebhook = asyncHandler(async (req, res) => {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (webhookSecret) {
        const rawBody = req.rawBody;
        if (!rawBody) {
            console.warn('[Webhook] rawBody not available — check middleware setup');
            return res.status(400).json({ success: false, message: 'Raw body unavailable' });
        }
        const valid = webhookService.verifySignature(rawBody, signature, webhookSecret);
        if (!valid) {
            console.warn('[Webhook] Invalid signature — rejected');
            return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
        }
    } else {
        console.warn('[Webhook] GITHUB_WEBHOOK_SECRET not set — signature verification skipped');
    }

    if (event === 'ping') {
        console.info('[Webhook] ping received');
        return res.status(200).json({ success: true, message: 'pong' });
    }

    if (event !== 'push') {
        return res.status(200).json({ success: true, message: `event "${event}" ignored` });
    }

    const results = await webhookService.handlePushEvent(req.body);

    return res.status(200).json({
        success: true,
        message: 'Webhook processed',
        data: { results },
    });
});

module.exports = { handleGithubWebhook };

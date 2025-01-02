const { sendSnapshotVerificationNotification } = require('../utils/discord');

describe('Discord Notifications', () => {
    test('should handle missing webhook URL', async () => {
        // Temporarily remove webhook URL from environment
        const originalUrl = process.env.DISCORD_WEBHOOK_URL;
        delete process.env.DISCORD_WEBHOOK_URL;

        const result = await sendSnapshotVerificationNotification(
            'XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf',
            100000000
        );

        expect(result).toBe(false);

        // Restore webhook URL
        process.env.DISCORD_WEBHOOK_URL = originalUrl;
    });

    test('should send notification successfully', async () => {
        const result = await sendSnapshotVerificationNotification(
            'XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf',
            100000000
        );

        expect(result).toBe(true);
    });
});
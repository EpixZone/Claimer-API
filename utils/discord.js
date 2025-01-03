// utils/discord.js
const axios = require('axios');
require('dotenv').config();

/**
 * Sends a notification to Discord about a successful snapshot verification
 * @param {string} x42Address - The x42 address that was verified
 * @param {number} snapshotBalance - The verified balance amount
 * @returns {Promise<boolean>} Returns true if notification was sent successfully, false otherwise
 */
async function sendSnapshotVerificationNotification(x42Address, snapshotBalance) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Discord webhook URL not configured, skipping notification');
        return false;
    }

    try {
        const formattedBalance = (snapshotBalance / 100000000).toFixed(8);

        const webhookMessage = {
            embeds: [{
                title: '🎉 New Claim Verified! 🎉',
                description: `A user has claimed thier snapshotted balance successfully.\n\nCheck the claim details at [claim.epix.zone](https://claim.epix.zone/)`,
                fields: [
                    {
                        name: 'x42 Address',
                        value: x42Address,
                        inline: true
                    },
                    {
                        name: 'Amount',
                        value: `${formattedBalance} x42`,
                        inline: true
                    }
                ],
                color: 3447003, // Discord blue color
                timestamp: new Date().toISOString()
            }]
        };

        await axios.post(webhookUrl, webhookMessage);
        return true;
    } catch (error) {
        console.error('Failed to send Discord webhook:', error);
        return false;
    }
}

module.exports = {
    sendSnapshotVerificationNotification
};
const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
    constructor(token, chatId) {
        this.enabled = token && chatId && token !== 'your_telegram_bot_token_here';
        if (this.enabled) {
            this.bot = new TelegramBot(token, { polling: false });
            this.chatId = chatId;
        }
    }

    async send(message) {
        if (!this.enabled) {
            console.log(`[TG] ${message}`);
            return;
        }

        try {
            await this.bot.sendMessage(this.chatId, message);
            console.log(`[TG] Sent: ${message}`);
        } catch (error) {
            console.error(`[TG] Error sending message:`, error.message);
        }
    }

    // Specific notification methods
    async notifyDiscovery(item, location) {
        await this.send(`Found ${item} at ${location}.`);
    }

    async notifyMining(ore, y) {
        await this.send(`Found ${ore} at Y=${y}. Mining now.`);
    }

    async notifyFarmProgress(action) {
        await this.send(`Farm ${action}.`);
    }

    async notifyInventoryFull() {
        await this.send(`Inventory full. Returning home.`);
    }

    async notifyDanger(threat) {
        await this.send(`Danger: ${threat}. Retreating.`);
    }

    async notifyBaseExpansion(structure) {
        await this.send(`Base expansion: ${structure} completed.`);
    }

    async notifyToolUpgrade(tool) {
        await this.send(`Tool upgraded: ${tool}.`);
    }

    async notifyResourceFound(resource, amount) {
        await this.send(`Collected ${amount} ${resource}.`);
    }

    async notifyStatus(status) {
        await this.send(`Status: ${status}.`);
    }
}

module.exports = TelegramNotifier;

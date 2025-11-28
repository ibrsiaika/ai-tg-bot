/**
 * Notifier Adapter Interface
 * Decouples notification sending from specific implementations (Telegram, Discord, etc.)
 */
class NotifierAdapter {
    /**
     * Send a general message
     * @param {string} message - Message to send
     * @returns {Promise<boolean>}
     */
    async send(message) {
        throw new Error('send() must be implemented by adapter');
    }

    /**
     * Send a discovery notification
     * @param {string} item - Item discovered
     * @param {string} location - Location of discovery
     */
    async notifyDiscovery(item, location) {
        await this.send(`Found ${item} at ${location}.`);
    }

    /**
     * Send a mining notification
     * @param {string} ore - Type of ore
     * @param {number} y - Y level
     */
    async notifyMining(ore, y) {
        await this.send(`Found ${ore} at Y=${y}. Mining now.`);
    }

    /**
     * Send a farm progress notification
     * @param {string} action - Farm action
     */
    async notifyFarmProgress(action) {
        await this.send(`Farm ${action}.`);
    }

    /**
     * Send an inventory full notification
     */
    async notifyInventoryFull() {
        await this.send(`Inventory full. Returning home.`);
    }

    /**
     * Send a danger notification
     * @param {string} threat - Type of threat
     */
    async notifyDanger(threat) {
        await this.send(`⚠️ Danger: ${threat}. Retreating.`);
    }

    /**
     * Send a base expansion notification
     * @param {string} structure - Structure built
     */
    async notifyBaseExpansion(structure) {
        await this.send(`🏗️ Base expansion: ${structure} completed.`);
    }

    /**
     * Send a tool upgrade notification
     * @param {string} tool - Tool upgraded
     */
    async notifyToolUpgrade(tool) {
        await this.send(`⚒️ Tool upgraded: ${tool}.`);
    }

    /**
     * Send a resource found notification
     * @param {string} resource - Resource type
     * @param {number} amount - Amount collected
     */
    async notifyResourceFound(resource, amount) {
        await this.send(`Collected ${amount} ${resource}.`);
    }

    /**
     * Send a status notification
     * @param {string} status - Status message
     */
    async notifyStatus(status) {
        await this.send(`Status: ${status}.`);
    }

    /**
     * Check if notifier is enabled/ready
     * @returns {boolean}
     */
    get enabled() {
        return false;
    }
}

/**
 * Telegram Notifier Adapter
 * Wraps the Telegram Bot API for notifications
 */
class TelegramAdapter extends NotifierAdapter {
    constructor(token, chatId) {
        super();
        this._enabled = token && chatId && token !== 'your_telegram_bot_token_here';
        this.chatId = chatId;
        this.bot = null;
        
        if (this._enabled) {
            const TelegramBot = require('node-telegram-bot-api');
            this.bot = new TelegramBot(token, { polling: false });
        }
    }

    async send(message) {
        if (!this._enabled) {
            console.log(`[TG] ${message}`);
            return false;
        }

        try {
            await this.bot.sendMessage(this.chatId, message);
            console.log(`[TG] Sent: ${message}`);
            return true;
        } catch (error) {
            console.error(`[TG] Error sending message:`, error.message);
            return false;
        }
    }

    get enabled() {
        return this._enabled;
    }
}

/**
 * Console Notifier Adapter
 * Outputs notifications to console (for testing/development)
 */
class ConsoleAdapter extends NotifierAdapter {
    constructor(prefix = '[BOT]') {
        super();
        this.prefix = prefix;
    }

    async send(message) {
        console.log(`${this.prefix} ${message}`);
        return true;
    }

    get enabled() {
        return true;
    }
}

/**
 * Multi-Channel Notifier
 * Sends notifications to multiple adapters
 */
class MultiChannelNotifier extends NotifierAdapter {
    constructor() {
        super();
        this.adapters = [];
    }

    /**
     * Add a notifier adapter
     * @param {NotifierAdapter} adapter - Adapter to add
     */
    addAdapter(adapter) {
        this.adapters.push(adapter);
    }

    /**
     * Remove a notifier adapter
     * @param {NotifierAdapter} adapter - Adapter to remove
     */
    removeAdapter(adapter) {
        const index = this.adapters.indexOf(adapter);
        if (index > -1) {
            this.adapters.splice(index, 1);
        }
    }

    async send(message) {
        const results = await Promise.all(
            this.adapters.map(adapter => 
                adapter.send(message).catch(() => false)
            )
        );
        return results.some(result => result === true);
    }

    get enabled() {
        return this.adapters.some(adapter => adapter.enabled);
    }
}

/**
 * Factory function to create the appropriate notifier
 * @param {Object} config - Configuration options
 * @returns {NotifierAdapter}
 */
function createNotifier(config = {}) {
    const { telegramToken, telegramChatId, consoleOnly = false } = config;

    if (consoleOnly) {
        return new ConsoleAdapter();
    }

    // Create multi-channel notifier
    const multiChannel = new MultiChannelNotifier();

    // Always add console adapter for local logging
    multiChannel.addAdapter(new ConsoleAdapter('[BOT]'));

    // Add Telegram if configured
    if (telegramToken && telegramChatId) {
        multiChannel.addAdapter(new TelegramAdapter(telegramToken, telegramChatId));
    }

    return multiChannel;
}

module.exports = {
    NotifierAdapter,
    TelegramAdapter,
    ConsoleAdapter,
    MultiChannelNotifier,
    createNotifier
};

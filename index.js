require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

// Import our systems
const TelegramNotifier = require('./src/telegram');
const SafetyMonitor = require('./src/safety');
const InventoryManager = require('./src/inventory');
const ResourceGatherer = require('./src/gathering');
const CraftingSystem = require('./src/crafting');
const MiningSystem = require('./src/mining');
const BuildingSystem = require('./src/building');
const CombatSystem = require('./src/combat');
const FarmingSystem = require('./src/farming');
const BehaviorManager = require('./src/behavior');
const ExplorationSystem = require('./src/exploration');
const AdvancedBaseSystem = require('./src/advancedBase');
const IntelligenceSystem = require('./src/intelligence');

class AutonomousMinecraftBot {
    constructor(config) {
        this.config = config;
        this.bot = null;
        this.systems = {};
    }

    async start() {
        console.log('Starting Autonomous Minecraft Bot');
        console.log('═══════════════════════════════════');
        
        // Create the Mineflayer bot
        this.bot = mineflayer.createBot({
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            version: this.config.version || false
        });

        // Setup event handlers
        this.setupEventHandlers();

        // Wait for bot to spawn
        await this.waitForSpawn();

        // Initialize all systems
        await this.initializeSystems();

        // Start autonomous behavior
        this.systems.behavior.start();
    }

    setupEventHandlers() {
        this.bot.on('login', () => {
            console.log('✓ Logged into server');
        });

        this.bot.on('spawn', () => {
            console.log('✓ Bot spawned in world');
            console.log(`Position: ${this.bot.entity.position}`);
        });

        this.bot.on('death', async () => {
            console.log('✗ Bot died - respawning');
            if (this.systems.notifier) {
                await this.systems.notifier.send('Bot died. Respawning...');
            }
        });

        this.bot.on('kicked', (reason) => {
            console.log('✗ Bot was kicked:', reason);
            if (this.systems.notifier) {
                this.systems.notifier.send(`Bot kicked: ${reason}`);
            }
        });

        this.bot.on('error', (err) => {
            console.error('✗ Bot error:', err);
        });

        this.bot.on('end', () => {
            console.log('✗ Bot disconnected');
            // Auto-reconnect after 5 seconds
            setTimeout(() => {
                console.log('Reconnecting...');
                this.start();
            }, 5000);
        });

        this.bot.on('health', () => {
            // Health monitoring is handled by SafetyMonitor
        });

        this.bot.on('entityHurt', (entity) => {
            if (entity === this.bot.entity) {
                console.log(`⚠ Bot took damage - Health: ${this.bot.health}/20`);
            }
        });
    }

    async waitForSpawn() {
        return new Promise((resolve) => {
            if (this.bot.entity) {
                resolve();
            } else {
                this.bot.once('spawn', () => {
                    resolve();
                });
            }
        });
    }

    async initializeSystems() {
        console.log('Initializing systems...');

        // Load pathfinder
        this.bot.loadPlugin(pathfinder);
        const mcData = require('minecraft-data')(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        this.bot.pathfinder.setMovements(defaultMove);

        // Initialize Telegram notifier
        this.systems.notifier = new TelegramNotifier(
            this.config.telegramToken,
            this.config.telegramChatId
        );

        // Initialize intelligence system (NEW - The Brain)
        this.systems.intelligence = new IntelligenceSystem(
            this.bot,
            this.systems.notifier
        );

        // Initialize safety monitor
        this.systems.safety = new SafetyMonitor(
            this.bot,
            this.config.minHealthPercent,
            this.config.minFoodLevel
        );

        // Initialize inventory manager
        this.systems.inventory = new InventoryManager(
            this.bot,
            this.systems.notifier
        );

        // Initialize resource gathering
        this.systems.gathering = new ResourceGatherer(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize crafting system
        this.systems.crafting = new CraftingSystem(
            this.bot,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize mining system
        this.systems.mining = new MiningSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.safety
        );

        // Set home position for mining
        this.systems.mining.setHome(this.bot.entity.position);

        // Initialize building system
        this.systems.building = new BuildingSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize combat system
        this.systems.combat = new CombatSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.safety
        );

        // Start combat monitoring
        this.systems.combat.startCombatMonitoring();

        // Initialize farming system
        this.systems.farming = new FarmingSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize exploration system (NEW)
        this.systems.exploration = new ExplorationSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Set home base for exploration
        this.systems.exploration.setHomeBase(this.bot.entity.position);

        // Connect gathering system to exploration system
        this.systems.gathering.setExplorationSystem(this.systems.exploration);

        // Initialize advanced base system (NEW)
        this.systems.advancedBase = new AdvancedBaseSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.building
        );

        // Initialize behavior manager (autonomous decision making)
        this.systems.behavior = new BehaviorManager(
            this.bot,
            this.systems,
            this.systems.notifier,
            this.systems.safety
        );

        console.log('✓ All systems initialized (13 systems online)');
        await this.systems.notifier.send('🤖 Enhanced AI systems online with advanced intelligence. Beginning autonomous operations.');
        
        // Set initial long-term goals
        this.systems.intelligence.addLongTermGoal('Gather basic resources', 0.9, { wood: 64, stone: 128 });
        this.systems.intelligence.addLongTermGoal('Build starter base', 0.8, { shelter: true });
        this.systems.intelligence.addLongTermGoal('Obtain diamond tools', 0.7, { diamond: 3 });
    }
}

// Main execution
const config = {
    host: process.env.MINECRAFT_HOST || 'localhost',
    port: parseInt(process.env.MINECRAFT_PORT) || 25565,
    username: process.env.MINECRAFT_USERNAME || 'AutoBot',
    version: process.env.MINECRAFT_VERSION || false,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    minHealthPercent: parseInt(process.env.MIN_HEALTH_PERCENT) || 60,
    minFoodLevel: parseInt(process.env.MIN_FOOD_LEVEL) || 10
};

console.log('═══════════════════════════════════════════════');
console.log('  AUTONOMOUS MINECRAFT BOT');
console.log('  Fully Automated Survival & Building Robot');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('Configuration:');
console.log(`  Server: ${config.host}:${config.port}`);
console.log(`  Username: ${config.username}`);
console.log(`  Telegram: ${config.telegramToken ? 'Enabled' : 'Disabled'}`);
console.log('');
console.log('Features:');
console.log('  ✓ Enhanced AI with adaptive behavior');
console.log('  ✓ Intelligent exploration & mapping');
console.log('  ✓ Advanced survival base building');
console.log('  ✓ Day/night cycle adaptation');
console.log('  ✓ Smart resource gathering');
console.log('  ✓ Automatic mining operations');
console.log('  ✓ Fortified base with watchtowers');
console.log('  ✓ Farming automation');
console.log('  ✓ Combat & defense systems');
console.log('  ✓ Tool crafting & upgrading');
console.log('  ✓ Inventory management');
console.log('  ✓ Telegram notifications');
console.log('  ✓ Performance tracking');
console.log('');
console.log('Starting bot...');
console.log('═══════════════════════════════════════════════');
console.log('');

const autonomousBot = new AutonomousMinecraftBot(config);
autonomousBot.start().catch(error => {
    console.error('Fatal error starting bot:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down bot...');
    if (autonomousBot.systems.behavior) {
        autonomousBot.systems.behavior.stop();
    }
    if (autonomousBot.bot) {
        autonomousBot.bot.quit();
    }
    process.exit(0);
});

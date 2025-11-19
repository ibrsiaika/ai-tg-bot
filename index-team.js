require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const Vec3 = require('vec3');

// Import systems
const TelegramNotifier = require('./src/telegram');
const InventoryManager = require('./src/inventory');
const ResourceGatherer = require('./src/gathering');
const CraftingSystem = require('./src/crafting');
const MiningSystem = require('./src/mining');
const BuildingSystem = require('./src/building');
const CombatSystem = require('./src/combat');
const FarmingSystem = require('./src/farming');
const ExplorationSystem = require('./src/exploration');
const AdvancedBaseSystem = require('./src/advancedBase');
const IntelligenceSystem = require('./src/intelligence');
const GeminiAI = require('./src/geminiAI');
const AdvancedPathfinding = require('./src/pathfinding');
const TeamCoordinator = require('./src/teamCoordinator');
const RoleBehaviorManager = require('./src/roleBehaviorManager');
const Utils = require('./src/utils');
const CONSTANTS = require('./src/constants');

/**
 * Multi-Bot Team Manager
 * 
 * Manages a team of specialized bots:
 * - Defender: Protects the base
 * - Builder: Constructs and expands
 * - Miner: Gathers resources
 */
class MultiBotTeam {
    constructor(config) {
        this.config = config;
        this.bots = new Map();
        this.notifier = null;
        this.teamCoordinator = null;
        this.baseLocation = null;
        this.reportingInterval = null; // Store interval for cleanup
    }

    async start() {
        console.log('═══════════════════════════════════════════════');
        console.log('  MULTI-BOT TEAM SYSTEM');
        console.log('  Coordinated Team-Based Operations');
        console.log('═══════════════════════════════════════════════');
        console.log('');

        // Initialize shared notifier
        this.notifier = new TelegramNotifier(
            this.config.telegramToken,
            this.config.telegramChatId
        );

        // Initialize team coordinator
        this.teamCoordinator = new TeamCoordinator(this.notifier);
        
        // Start automatic cleanup
        this.teamCoordinator.startCleanup();

        // Create three specialized bots
        await this.createBot('defender', 'DefenderBot');
        await this.sleep(3000); // Wait between bot spawns
        
        await this.createBot('builder', 'BuilderBot');
        await this.sleep(3000);
        
        await this.createBot('miner', 'MinerBot');

        // Wait for all bots to spawn
        await this.sleep(5000);

        // Set shared base location (use first bot's spawn location)
        const firstBot = Array.from(this.bots.values())[0];
        if (firstBot && firstBot.bot.entity) {
            this.baseLocation = firstBot.bot.entity.position.clone();
            this.teamCoordinator.setBaseLocation(this.baseLocation);
            console.log(`\n✓ Base location set: ${this.baseLocation}`);
        }

        // Send team startup notification
        await this.notifier.send('🤖🤖🤖 TEAM SYSTEM ACTIVATED!\n\nThree specialized bots working together:\n• Defender - Protects the base\n• Builder - Constructs structures\n• Miner - Gathers resources\n\nTeamwork enabled with AI integration!');

        // Start periodic team reports
        this.startTeamReporting();
    }

    async createBot(role, username) {
        console.log(`\nCreating ${role} bot: ${username}...`);

        const bot = mineflayer.createBot({
            host: this.config.host,
            port: this.config.port,
            username: username,
            version: this.config.version || false
        });

        // Setup basic event handlers
        this.setupBotEventHandlers(bot, role);

        // Wait for spawn
        await new Promise((resolve) => {
            bot.once('spawn', () => {
                console.log(`✓ ${username} spawned in world`);
                resolve();
            });
        });

        // Initialize systems for this bot
        const systems = await this.initializeBotSystems(bot, role);

        // Register with team coordinator
        this.teamCoordinator.registerBot(username, bot, role);

        // Create and start role-based behavior
        const behaviorManager = new RoleBehaviorManager(
            bot,
            systems,
            this.notifier,
            role,
            this.teamCoordinator
        );
        
        await behaviorManager.start();

        // Store bot data
        this.bots.set(username, {
            bot,
            role,
            systems,
            behaviorManager
        });

        console.log(`✓ ${username} (${role}) is now active`);
    }

    setupBotEventHandlers(bot, role) {
        bot.on('login', () => {
            console.log(`[${role}] Logged into server`);
        });

        bot.on('error', (err) => {
            if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
                // Ignore non-fatal protocol errors
                return;
            }
            console.error(`[${role}] Bot error:`, err.message);
        });

        bot.on('kicked', (reason) => {
            console.log(`[${role}] Bot was kicked:`, reason);
            this.notifier.send(`⚠️ ${role.toUpperCase()} bot was kicked: ${reason}`);
        });

        bot.on('death', () => {
            console.log(`[${role}] Bot died - respawning`);
            this.notifier.send(`⚠️ ${role.toUpperCase()} bot died. Respawning...`);
        });

        bot.on('end', () => {
            console.log(`[${role}] Bot disconnected`);
            
            // Stop behavior manager for this bot
            const botData = Array.from(this.bots.values()).find(b => b.bot === bot);
            if (botData && botData.behaviorManager) {
                botData.behaviorManager.stop();
            }
        });
    }

    async initializeBotSystems(bot, role) {
        const systems = {};

        // Load pathfinder
        bot.loadPlugin(pathfinder);
        const mcData = require('minecraft-data')(bot.version);
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);

        // Load collectblock
        bot.loadPlugin(collectBlock);

        // Initialize core systems
        systems.geminiAI = new GeminiAI(
            this.config.geminiApiKey,
            this.notifier
        );

        systems.pathfinding = new AdvancedPathfinding(
            bot,
            this.notifier
        );

        systems.intelligence = new IntelligenceSystem(
            bot,
            this.notifier
        );

        systems.inventory = new InventoryManager(
            bot,
            this.notifier
        );

        systems.gathering = new ResourceGatherer(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory
        );

        systems.crafting = new CraftingSystem(
            bot,
            this.notifier,
            systems.inventory
        );

        systems.mining = new MiningSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory,
            null // No safety monitor for now
        );

        systems.building = new BuildingSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory
        );

        systems.combat = new CombatSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory,
            null // No safety monitor
        );

        systems.farming = new FarmingSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory
        );

        systems.exploration = new ExplorationSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory
        );

        systems.advancedBase = new AdvancedBaseSystem(
            bot,
            bot.pathfinder,
            this.notifier,
            systems.inventory,
            systems.building
        );

        // Link systems
        systems.exploration.setHomeBase(bot.entity.position);
        systems.gathering.setExplorationSystem(systems.exploration);

        return systems;
    }

    startTeamReporting() {
        // Generate team status report every 10 minutes
        this.reportingInterval = setInterval(async () => {
            try {
                const report = this.teamCoordinator.generateReport();
                console.log('\n' + report);
                
                // Send summary to Telegram
                const status = this.teamCoordinator.getTeamStatus();
                const summary = `📊 TEAM STATUS UPDATE\n\n` +
                    `Defender: ${status.defender.active ? '🟢' : '🔴'} HP:${status.defender.health}\n` +
                    `Builder: ${status.builder.active ? '🟢' : '🔴'} HP:${status.builder.health}\n` +
                    `Miner: ${status.miner.active ? '🟢' : '🔴'} HP:${status.miner.health}\n\n` +
                    `Active Requests: ${status.activeRequests}`;
                
                await this.notifier.send(summary);
            } catch (error) {
                console.error('Error generating team report:', error.message);
            }
        }, 600000); // 10 minutes
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        console.log('\nShutting down team...');
        
        // Stop reporting interval
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
            this.reportingInterval = null;
        }
        
        // Stop all bots
        for (const [username, botData] of this.bots.entries()) {
            console.log(`Stopping ${username}...`);
            
            if (botData.behaviorManager) {
                botData.behaviorManager.stop();
            }
            
            if (botData.bot) {
                try {
                    botData.bot.quit();
                } catch (error) {
                    console.error(`Error stopping ${username}:`, error.message);
                }
            }
        }
        
        // Clear bots map
        this.bots.clear();
        
        // Shutdown team coordinator
        if (this.teamCoordinator) {
            this.teamCoordinator.shutdown();
        }
        
        await this.notifier.send('🛑 Team system shutdown complete');
        console.log('Team shutdown complete');
    }
}

// Main execution
const config = {
    host: process.env.MINECRAFT_HOST || 'localhost',
    port: parseInt(process.env.MINECRAFT_PORT) || 25565,
    version: process.env.MINECRAFT_VERSION || false,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    geminiApiKey: process.env.GEMINI_API_KEY
};

// Validate configuration
const validation = Utils.validateConfig(config);
if (!validation.valid) {
    console.error('═══════════════════════════════════════════════');
    console.error('  CONFIGURATION ERROR');
    console.error('═══════════════════════════════════════════════');
    console.error('');
    console.error('The following configuration errors were found:');
    validation.errors.forEach(error => console.error(`  ✗ ${error}`));
    console.error('');
    console.error('Please check your .env file and try again.');
    console.error('═══════════════════════════════════════════════');
    process.exit(1);
}

console.log('Configuration:');
console.log(`  Server: ${config.host}:${config.port}`);
console.log(`  Telegram: ${config.telegramToken ? 'Enabled' : 'Disabled'}`);
console.log(`  Gemini AI: ${config.geminiApiKey ? 'Enabled' : 'Disabled'}`);
console.log('');
console.log('Starting multi-bot team...');
console.log('');

const team = new MultiBotTeam(config);
team.start().catch(error => {
    console.error('Fatal error starting team:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived shutdown signal...');
    await team.shutdown();
    process.exit(0);
});

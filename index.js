require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
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
const ToolDurabilityManager = require('./src/toolDurability');
const FishingSystem = require('./src/fishing');
const BackupSystem = require('./src/backup');
const Utils = require('./src/utils');
const CONSTANTS = require('./src/constants');
const AdvancedPathfinding = require('./src/pathfinding');
const MobThreatAI = require('./src/mobThreatAI');
const ResourcePredictor = require('./src/resourcePredictor');
const NetherNavigation = require('./src/netherNavigation');
const EnchantingSystem = require('./src/enchanting');
const AdvancedFarmSystem = require('./src/advancedFarming');
const SortingSystem = require('./src/sorting');
const PerformanceAnalytics = require('./src/analytics');
const MultiGoalPlanner = require('./src/questPlanner');
const GeminiAI = require('./src/geminiAI');
const ItemProtection = require('./src/itemProtection');
const AIOrchestrator = require('./src/aiOrchestrator');
const ErrorHandler = require('./src/errorHandler');
const OptimizationManager = require('./src/optimizationManager');

// NEW v4.0.0 Systems
const EventBus = require('./src/eventBus');
const StorageSystem = require('./src/storage');
const Dashboard = require('./src/dashboard');
const SocketIOServer = require('./src/socketServer');

class AutonomousMinecraftBot {
    constructor(config) {
        this.config = config;
        this.bot = null;
        this.systems = {};
        this.errorCounts = new Map(); // Track error counts for rate limiting
        this.lastErrorTime = new Map(); // Track last error time for rate limiting
        this.intervals = []; // Track all setInterval IDs for cleanup
    }

    /**
     * Safely extract bot state with fallback values
     * Ensures all required properties exist for database storage
     */
    extractBotState() {
        if (!this.bot) {
            return null;
        }

        // Safely extract position with fallback to default spawn values
        const position = this.bot.entity?.position || {};
        
        return {
            position: {
                x: position.x ?? CONSTANTS.STATE.DEFAULT_SPAWN_POSITION.x,
                y: position.y ?? CONSTANTS.STATE.DEFAULT_SPAWN_POSITION.y,
                z: position.z ?? CONSTANTS.STATE.DEFAULT_SPAWN_POSITION.z
            },
            health: this.bot.health ?? CONSTANTS.STATE.DEFAULT_HEALTH,
            food: this.bot.food ?? CONSTANTS.STATE.DEFAULT_FOOD,
            inventory: this.bot.inventory?.items?.()?.map(item => ({
                name: item.name,
                count: item.count
            })) || []
        };
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

    /**
     * Log errors with rate limiting to prevent console spam
     * Only logs the same error type once per minute
     */
    logRateLimitedError(errorType, message) {
        const now = Date.now();
        const rateLimitMs = 60000; // 1 minute
        
        // Initialize counter if not exists
        if (!this.errorCounts.has(errorType)) {
            this.errorCounts.set(errorType, 0);
            this.lastErrorTime.set(errorType, 0);
        }
        
        const count = this.errorCounts.get(errorType);
        const lastTime = this.lastErrorTime.get(errorType);
        
        // Increment counter
        this.errorCounts.set(errorType, count + 1);
        
        // Only log if enough time has passed
        if (now - lastTime > rateLimitMs) {
            const totalCount = this.errorCounts.get(errorType);
            if (totalCount === 1) {
                console.warn(`⚠ ${errorType} detected (non-fatal, will be suppressed if repeated): ${message}`);
            } else {
                console.warn(`⚠ ${errorType} occurred ${totalCount} times in last ${Math.floor((now - lastTime) / 1000)}s (suppressing further messages for 1 min)`);
            }
            this.lastErrorTime.set(errorType, now);
        }
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

        this.bot.on('error', async (err) => {
            // Use advanced error handler if available
            if (this.systems && this.systems.errorHandler) {
                await this.systems.errorHandler.handleError(err, { source: 'bot_error_event' });
                return;
            }
            
            // Fallback: Handle PartialReadError gracefully - these are protocol-level errors that don't require a restart
            if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError')) {
                this.logRateLimitedError('PartialReadError', err.message);
                // Log but don't crash - the bot can continue operating
                return;
            }
            
            console.error('✗ Bot error:', err);
        });
        
        // Add error handler for the underlying client to catch PartialReadError at the protocol level
        this.bot.once('inject_allowed', () => {
            if (this.bot._client) {
                this.bot._client.on('error', (err) => {
                    // Handle PartialReadError and other protocol errors gracefully
                    if (err.name === 'PartialReadError' || err.message?.includes('PartialReadError') || 
                        err.message?.includes('Read error')) {
                        this.logRateLimitedError('ClientProtocolError', err.message || err.name);
                        // Don't let these errors crash the bot
                        return;
                    }
                    // Let other errors bubble up to the bot error handler
                    this.bot.emit('error', err);
                });
            }
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

        // NEW v4.0.0: Initialize Event Bus first (needed by other systems)
        this.systems.eventBus = new EventBus();
        console.log('✓ Event Bus initialized');

        // NEW v4.0.0: Initialize Storage System
        this.systems.storage = new StorageSystem('./bot-data/bot-storage.db');
        await this.systems.storage.initialize();
        
        // Try to restore previous state
        const previousState = await this.systems.storage.loadState();
        if (previousState) {
            console.log(`✓ Restored previous state from ${new Date(previousState.timestamp).toLocaleString()}`);
        }

        // Load pathfinder
        this.bot.loadPlugin(pathfinder);
        const mcData = require('minecraft-data')(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        this.bot.pathfinder.setMovements(defaultMove);

        // Load collectblock plugin for automatic item collection
        this.bot.loadPlugin(collectBlock);
        console.log('✓ Collectblock plugin loaded');

        // Initialize Telegram notifier
        this.systems.notifier = new TelegramNotifier(
            this.config.telegramToken,
            this.config.telegramChatId
        );

        // Initialize Gemini AI (NEW - Phase 1)
        this.systems.geminiAI = new GeminiAI(
            this.config.geminiApiKey,
            this.systems.notifier
        );

        // Initialize advanced pathfinding (PHASE 2)
        this.systems.pathfinding = new AdvancedPathfinding(
            this.bot,
            this.systems.notifier
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

        // Initialize resource predictor (PHASE 2)
        this.systems.resourcePredictor = new ResourcePredictor(
            this.bot,
            this.systems.notifier,
            this.systems.inventory
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

        // Initialize item protection system (NEW - Phase 3)
        this.systems.itemProtection = new ItemProtection(
            this.bot,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize error handler (NEW - Optimization)
        this.systems.errorHandler = new ErrorHandler(
            this.bot,
            this.systems,
            this.systems.notifier
        );

        // Initialize tool durability manager (NEW) - must be after inventory and crafting
        this.systems.toolDurability = new ToolDurabilityManager(
            this.bot,
            this.systems.inventory,
            this.systems.crafting,
            this.systems.notifier
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

        // Initialize Nether navigation (PHASE 2)
        this.systems.netherNavigation = new NetherNavigation(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.safety
        );

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

        // Initialize mob threat AI (PHASE 2)
        this.systems.mobThreatAI = new MobThreatAI(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier
        );

        // Start combat monitoring
        this.systems.combat.startCombatMonitoring();
        
        // Link Mob Threat AI to combat system
        this.systems.combat.setMobThreatAI(this.systems.mobThreatAI);

        // Initialize farming system
        this.systems.farming = new FarmingSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize fishing system (NEW)
        this.systems.fishing = new FishingSystem(
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
        
        // Connect resource predictor to gathering system
        this.systems.gathering.setResourcePredictor(this.systems.resourcePredictor);

        // Initialize advanced base system (NEW)
        this.systems.advancedBase = new AdvancedBaseSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.building
        );
        
        // Link crafting system to advanced base (after crafting is initialized)
        this.systems.advancedBase.setCraftingSystem(this.systems.crafting);

        // Initialize behavior manager (autonomous decision making)
        this.systems.behavior = new BehaviorManager(
            this.bot,
            this.systems,
            this.systems.notifier,
            this.systems.safety
        );

        // Initialize backup system (NEW)
        this.systems.backup = new BackupSystem(
            this.bot,
            this.systems,
            this.systems.notifier
        );

        // Initialize enchanting system (PHASE 2)
        this.systems.enchanting = new EnchantingSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.crafting
        );

        // Initialize advanced farming (PHASE 3)
        this.systems.advancedFarming = new AdvancedFarmSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory,
            this.systems.building
        );

        // Initialize sorting system (PHASE 3)
        this.systems.sorting = new SortingSystem(
            this.bot,
            this.bot.pathfinder,
            this.systems.notifier,
            this.systems.inventory
        );

        // Initialize performance analytics (PHASE 4)
        this.systems.analytics = new PerformanceAnalytics(
            this.bot,
            this.systems.notifier,
            this.systems
        );

        // Initialize multi-goal planner (PHASE 4)
        this.systems.questPlanner = new MultiGoalPlanner(
            this.bot,
            this.systems.notifier,
            this.systems
        );

        // Initialize AI Orchestrator (NEW - Hybrid Intelligence)
        this.systems.aiOrchestrator = new AIOrchestrator(
            this.bot,
            this.systems,
            this.systems.notifier
        );

        // Initialize Optimization Manager (NEW - Performance)
        this.systems.optimizationManager = new OptimizationManager(
            this.bot,
            this.systems,
            this.systems.notifier
        );

        // NEW v4.0.0: Initialize Dashboard (optional - start on separate port)
        if (this.config.enableDashboard !== false) {
            this.systems.dashboard = new Dashboard(
                this.bot,
                this.systems,
                this.config.dashboardPort || 3000
            );
            
            // Start dashboard in background (don't await to avoid blocking)
            this.systems.dashboard.start().catch(error => {
                console.warn('⚠ Dashboard failed to start:', error.message);
                this.systems.dashboard = null;
            });
        }

        // NEW v4.1.0: Initialize Socket.IO Server for real-time dashboard updates
        this.systems.socketServer = new SocketIOServer();
        if (this.systems.socketServer.enabled) {
            // Pass EventBus instance to Socket.IO Server
            this.systems.socketServer.setEventBus(this.systems.eventBus);
            this.systems.socketServer.attachBot(this.bot);
            console.log('✓ Socket.IO Server initialized for real-time updates');
        }

        console.log('✓ All systems initialized (33 systems online)');
        await this.systems.notifier.send('🤖 ENTERPRISE v4.0.0: 33 AI systems online! NEW: Persistent Storage, Event Bus, Web Dashboard. Features: Hybrid Intelligence, Advanced Error Recovery, Performance Optimization, State Persistence. Beginning fully optimized autonomous operations with enterprise-grade monitoring.');
        
        // Emit system initialized event
        if (this.systems.eventBus) {
            this.systems.eventBus.emit(EventBus.EVENTS.SYSTEM_INITIALIZED, {
                systemCount: 33,
                version: '4.0.0',
                timestamp: Date.now()
            });
        }
        
        // Set up periodic real-time updates for dashboard
        this.startRealtimeUpdates();
        
        // Set initial long-term goals
        this.systems.intelligence.addLongTermGoal('Gather basic resources', 0.9, { wood: 64, stone: 128 });
        this.systems.intelligence.addLongTermGoal('Build starter base', 0.8, { shelter: true });
        this.systems.intelligence.addLongTermGoal('Obtain diamond tools', 0.7, { diamond: 3 });
        
        // Start quest chain
        const recommendedChain = this.systems.questPlanner.recommendNextChain();
        if (recommendedChain) {
            this.systems.questPlanner.startQuestChain(recommendedChain);
        }
        
        // Start automatic backups
        this.systems.backup.startAutomaticBackups();
        
        // Start performance optimization
        this.systems.optimizationManager.startOptimization();
        
        // NEW v4.0.0: Start periodic state saving (every 5 minutes)
        this.startPeriodicStateSaving();
    }

    /**
     * NEW v4.0.0: Periodically save bot state to storage
     */
    startPeriodicStateSaving() {
        const SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
        
        setInterval(async () => {
            try {
                if (!this.systems.storage) return;
                
                const botState = this.extractBotState();
                if (!botState) return;
                
                const state = {
                    ...botState,
                    goals: this.systems.intelligence?.longTermGoals?.map(g => g.description) || [],
                    currentGoal: this.systems.behavior?.currentGoal || null,
                    metadata: {
                        uptime: process.uptime(),
                        timestamp: Date.now()
                    }
                };
                
                await this.systems.storage.saveState(state);
                
                // Save performance metrics
                if (this.systems.analytics) {
                    const metrics = this.systems.analytics.getMetrics?.();
                    if (metrics) {
                        await this.systems.storage.saveMetric('decisions_per_minute', metrics.decisionsPerMinute || 0);
                        await this.systems.storage.saveMetric('errors_per_hour', metrics.errorsPerHour || 0);
                    }
                }
            } catch (error) {
                console.warn('⚠ Failed to save periodic state:', error.message);
            }
        }, SAVE_INTERVAL);
        
        console.log('✓ Periodic state saving enabled (every 5 minutes)');
    }

    /**
     * NEW v4.1.0: Send real-time updates to dashboard via EventBus
     */
    startRealtimeUpdates() {
        if (!this.systems.eventBus) return;

        // Emit inventory updates every 5 seconds
        const inventoryInterval = setInterval(() => {
            if (this.bot && this.bot.inventory) {
                const inventoryData = this.bot.inventory.items().map(item => ({
                    name: item.name,
                    count: item.count,
                    slot: item.slot
                }));
                this.systems.eventBus.emit('bot:inventory', inventoryData);
            }
        }, 5000);
        this.intervals.push(inventoryInterval);

        // Emit system status updates every 10 seconds
        const systemsInterval = setInterval(() => {
            const systemsStatus = {
                behavior: this.systems.behavior?.isActive ? 'active' : 'idle',
                mining: this.systems.mining ? 'online' : 'offline',
                farming: this.systems.farming ? 'online' : 'offline',
                combat: this.systems.combat ? 'online' : 'offline',
                building: this.systems.building ? 'online' : 'offline',
                gathering: this.systems.gathering ? 'online' : 'offline',
                exploration: this.systems.exploration ? 'online' : 'offline',
                telegram: this.systems.notifier?.enabled ? 'online' : 'offline',
                mlEngine: process.env.ML_ENABLED === 'true' ? 'online' : 'offline',
                socketIO: this.systems.socketServer?.enabled ? 'online' : 'offline',
                dashboard: this.systems.dashboard ? 'online' : 'offline',
                currentGoal: this.systems.behavior?.currentGoal?.name || 'idle'
            };
            this.systems.eventBus.emit('bot:systems', systemsStatus);
        }, 10000);
        this.intervals.push(systemsInterval);

        console.log('✓ Real-time dashboard updates enabled');
    }

    /**
     * Clean up all intervals to prevent memory leaks
     */
    cleanup() {
        // Clear all setInterval timers
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.intervals = [];
        
        // Stop dashboard
        if (this.systems.dashboard) {
            this.systems.dashboard.stop();
        }
        
        // Close Socket.IO server
        if (this.systems.socketServer) {
            this.systems.socketServer.close();
        }
        
        console.log('✓ Cleanup complete');
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
    geminiApiKey: process.env.GEMINI_API_KEY,
    minHealthPercent: parseInt(process.env.MIN_HEALTH_PERCENT) || CONSTANTS.SAFETY.DEFAULT_MIN_HEALTH_PERCENT,
    minFoodLevel: parseInt(process.env.MIN_FOOD_LEVEL) || CONSTANTS.SAFETY.DEFAULT_MIN_FOOD_LEVEL,
    // NEW v4.0.0 config options
    enableDashboard: process.env.ENABLE_DASHBOARD !== 'false', // Default enabled
    dashboardPort: parseInt(process.env.DASHBOARD_PORT) || 3001
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

console.log('═══════════════════════════════════════════════');
console.log('  AUTONOMOUS MINECRAFT BOT v4.0.0');
console.log('  Enterprise-Grade Automation Framework');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('Configuration:');
console.log(`  Server: ${config.host}:${config.port}`);
console.log(`  Username: ${config.username}`);
console.log(`  Telegram: ${config.telegramToken ? 'Enabled' : 'Disabled'}`);
console.log(`  Dashboard: ${config.enableDashboard ? `Enabled (port ${config.dashboardPort})` : 'Disabled'}`);
console.log(`  Health Threshold: ${config.minHealthPercent}%`);
console.log(`  Food Threshold: ${config.minFoodLevel}`);
console.log('');
console.log('Features (v4.0.0):');
console.log('  ✓ Persistent Storage & State Recovery');
console.log('  ✓ Web Dashboard with Real-time Updates');
console.log('  ✓ Event-Driven Architecture');
console.log('  ✓ Comprehensive Test Coverage');
console.log('  ✓ Enhanced AI with adaptive behavior');
console.log('  ✓ Advanced intelligence "brain" system');
console.log('  ✓ Learning from experience');
console.log('  ✓ Tool durability management');
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
console.log('  ✓ Risk assessment');
console.log('');
console.log('Starting bot...');
console.log('═══════════════════════════════════════════════');
console.log('');

// Intercept console.error to filter out PartialReadError stack traces
const originalConsoleError = console.error;
console.error = function(...args) {
    // Convert arguments to string for checking
    const errorString = args.join(' ');
    
    // Filter out PartialReadError stack traces
    if (errorString.includes('PartialReadError') || 
        errorString.includes('Read error for undefined') ||
        errorString.includes('protodef/src/') ||
        errorString.includes('SlotComponent') ||
        errorString.includes('packet_entity_equipment')) {
        // Silently suppress these non-fatal protocol errors
        return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
};

// Global error handlers for protocol errors
process.on('unhandledRejection', (reason, promise) => {
    // Suppress PartialReadError from unhandled promise rejections
    if (reason && (reason.name === 'PartialReadError' || 
                   reason.message?.includes('PartialReadError') ||
                   reason.message?.includes('Read error'))) {
        // Silently ignore - these are non-fatal protocol errors
        return;
    }
    originalConsoleError('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    // Suppress PartialReadError from uncaught exceptions
    if (error.name === 'PartialReadError' || 
        error.message?.includes('PartialReadError') ||
        error.message?.includes('Read error')) {
        // Silently ignore - these are non-fatal protocol errors
        return;
    }
    originalConsoleError('Uncaught Exception:', error);
});

const autonomousBot = new AutonomousMinecraftBot(config);
autonomousBot.start().catch(error => {
    console.error('Fatal error starting bot:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down bot...');
    
    // NEW v4.0.0: Save final state to storage
    if (autonomousBot.systems && autonomousBot.systems.storage) {
        console.log('Saving final state...');
        try {
            const botState = autonomousBot.extractBotState();
            if (botState) {
                const finalState = {
                    ...botState,
                    goals: autonomousBot.systems.intelligence?.longTermGoals?.map(g => g.description) || [],
                    currentGoal: autonomousBot.systems.behavior?.currentGoal || null,
                    metadata: {
                        shutdownTime: Date.now(),
                        uptime: process.uptime()
                    }
                };
                await autonomousBot.systems.storage.saveState(finalState);
                console.log('✓ Final state saved');
            }
        } catch (error) {
            console.warn('⚠ Failed to save final state:', error.message);
        }
    }
    
    // Create final backup before shutdown
    if (autonomousBot.systems && autonomousBot.systems.backup) {
        console.log('Creating final backup...');
        await autonomousBot.systems.backup.createBackup();
        autonomousBot.systems.backup.stopAutomaticBackups();
    }
    
    // Stop dashboard
    if (autonomousBot.systems && autonomousBot.systems.dashboard) {
        console.log('Stopping dashboard...');
        autonomousBot.systems.dashboard.stop();
    }
    
    // Close storage
    if (autonomousBot.systems && autonomousBot.systems.storage) {
        console.log('Closing storage...');
        autonomousBot.systems.storage.close();
    }
    
    if (autonomousBot.systems && autonomousBot.systems.behavior) {
        autonomousBot.systems.behavior.stop();
    }
    
    // Cleanup on shutdown (clears intervals, stops dashboard and socket server)
    if (autonomousBot) {
        console.log('Cleaning up systems...');
        autonomousBot.cleanup();
    }
    
    if (autonomousBot.bot) {
        autonomousBot.bot.quit();
    }
    
    console.log('Bot shutdown complete');
    process.exit(0);
});

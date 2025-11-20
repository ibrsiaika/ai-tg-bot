const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const winston = require('winston');

/**
 * Enhanced Logging & Monitoring Dashboard
 * Web-based visibility into bot operations with real-time updates
 */
class Dashboard {
    constructor(bot, systems, port = 3000) {
        this.bot = bot;
        this.systems = systems;
        this.port = port;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.logBuffer = [];
        this.maxLogBufferSize = 1000;
        
        // Initialize winston logger
        this.initializeLogger();
        
        // Setup Express middleware
        this.app.use(cors());
        this.app.use(express.json());
        
        // Setup routes
        this.setupRoutes();
    }

    /**
     * Initialize winston logger for structured logging
     */
    initializeLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/error.log', 
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                new winston.transports.File({ 
                    filename: 'logs/combined.log',
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    /**
     * Log message and broadcast to connected clients
     */
    log(level, message, metadata = {}) {
        const logEntry = {
            timestamp: Date.now(),
            level,
            message,
            metadata
        };

        // Add to buffer
        this.logBuffer.push(logEntry);
        if (this.logBuffer.length > this.maxLogBufferSize) {
            this.logBuffer.shift();
        }

        // Log with winston
        this.logger.log(level, message, metadata);

        // Broadcast to websocket clients
        this.broadcast({
            type: 'log',
            data: logEntry
        });

        // Save to storage if available
        if (this.systems.storage) {
            this.systems.storage.saveMetric(`log_${level}`, 1, { message, ...metadata });
        }
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        // Get real-time bot status
        this.app.get('/api/status', (req, res) => {
            try {
                const status = this.getBotStatus();
                res.json(status);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get performance metrics
        this.app.get('/api/metrics', async (req, res) => {
            try {
                const metrics = await this.getMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get logs
        this.app.get('/api/logs', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const level = req.query.level;
                
                let logs = [...this.logBuffer];
                if (level) {
                    logs = logs.filter(log => log.level === level);
                }
                
                res.json({
                    logs: logs.slice(-limit),
                    total: logs.length
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get system health status
        this.app.get('/api/systems', (req, res) => {
            try {
                const systemsHealth = this.getSystemsHealth();
                res.json(systemsHealth);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Execute remote command
        this.app.post('/api/command', async (req, res) => {
            try {
                const { command, args } = req.body;
                const result = await this.executeCommand(command, args);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get storage stats
        this.app.get('/api/storage/stats', async (req, res) => {
            try {
                if (!this.systems.storage) {
                    return res.json({ error: 'Storage not available' });
                }
                const stats = await this.systems.storage.getStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get event bus history
        this.app.get('/api/events', (req, res) => {
            try {
                if (!this.systems.eventBus) {
                    return res.json({ error: 'Event bus not available' });
                }
                const limit = parseInt(req.query.limit) || 100;
                const eventType = req.query.type;
                const history = this.systems.eventBus.getHistory(eventType, limit);
                res.json({
                    events: history,
                    total: history.length
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    /**
     * Get current bot status
     */
    getBotStatus() {
        if (!this.bot || !this.bot.entity) {
            return { online: false };
        }

        return {
            online: true,
            username: this.bot.username,
            health: this.bot.health,
            food: this.bot.food,
            position: {
                x: Math.floor(this.bot.entity.position.x),
                y: Math.floor(this.bot.entity.position.y),
                z: Math.floor(this.bot.entity.position.z)
            },
            gameMode: this.bot.game?.gameMode,
            experience: {
                level: this.bot.experience?.level,
                points: this.bot.experience?.points
            },
            currentGoal: this.systems.behavior?.currentGoal || null,
            timestamp: Date.now()
        };
    }

    /**
     * Get performance metrics
     */
    async getMetrics() {
        const metrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            timestamp: Date.now()
        };

        // Add bot-specific metrics
        if (this.systems.analytics) {
            metrics.performance = this.systems.analytics.getMetrics?.();
        }

        // Add storage metrics if available
        if (this.systems.storage) {
            const stats = await this.systems.storage.getStats();
            metrics.storage = stats;
        }

        return metrics;
    }

    /**
     * Get all systems health status
     */
    getSystemsHealth() {
        const systemNames = [
            'notifier', 'geminiAI', 'pathfinding', 'intelligence', 'safety',
            'inventory', 'resourcePredictor', 'gathering', 'crafting',
            'itemProtection', 'errorHandler', 'toolDurability', 'mining',
            'netherNavigation', 'building', 'combat', 'mobThreatAI',
            'farming', 'fishing', 'exploration', 'advancedBase', 'behavior',
            'backup', 'enchanting', 'advancedFarming', 'sorting',
            'analytics', 'questPlanner', 'aiOrchestrator', 'optimizationManager',
            'storage', 'eventBus'
        ];

        const health = {};
        for (const name of systemNames) {
            health[name] = {
                online: !!this.systems[name],
                status: this.systems[name] ? 'operational' : 'offline'
            };
        }

        return {
            systems: health,
            totalSystems: systemNames.length,
            onlineSystems: Object.values(health).filter(s => s.online).length,
            timestamp: Date.now()
        };
    }

    /**
     * Execute remote command
     */
    async executeCommand(command, args = {}) {
        this.log('info', 'Executing remote command', { command, args });

        switch (command) {
            case 'goto':
                if (this.bot && args.x !== undefined && args.y !== undefined && args.z !== undefined) {
                    const { goals } = require('mineflayer-pathfinder');
                    const goal = new goals.GoalNear(args.x, args.y, args.z, 1);
                    await this.bot.pathfinder.goto(goal);
                    return { message: `Moving to ${args.x}, ${args.y}, ${args.z}` };
                }
                throw new Error('Invalid coordinates');

            case 'gather':
                if (this.systems.gathering && args.resource) {
                    await this.systems.gathering.gatherResource(args.resource, args.count || 1);
                    return { message: `Gathering ${args.resource}` };
                }
                throw new Error('Gathering system not available');

            case 'restart':
                this.log('warn', 'Bot restart requested via API');
                setTimeout(() => process.exit(0), 1000);
                return { message: 'Restarting bot...' };

            case 'backup':
                if (this.systems.backup) {
                    await this.systems.backup.createBackup();
                    return { message: 'Backup created' };
                }
                throw new Error('Backup system not available');

            case 'status':
                return this.getBotStatus();

            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    /**
     * Start the dashboard server
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                // Create HTTP server
                this.server = http.createServer(this.app);

                // Setup WebSocket server
                this.wss = new WebSocket.Server({ server: this.server });

                this.wss.on('connection', (ws) => {
                    this.clients.add(ws);
                    this.log('info', 'Dashboard client connected', { 
                        totalClients: this.clients.size 
                    });

                    // Send initial status
                    ws.send(JSON.stringify({
                        type: 'status',
                        data: this.getBotStatus()
                    }));

                    ws.on('close', () => {
                        this.clients.delete(ws);
                        this.log('info', 'Dashboard client disconnected', { 
                            totalClients: this.clients.size 
                        });
                    });

                    ws.on('error', (error) => {
                        this.log('error', 'WebSocket error', { error: error.message });
                    });
                });

                // Start listening
                this.server.listen(this.port, () => {
                    console.log(`✓ Dashboard server started on port ${this.port}`);
                    console.log(`  API: http://localhost:${this.port}/api/status`);
                    console.log(`  WebSocket: ws://localhost:${this.port}`);
                    this.log('info', 'Dashboard server started', { port: this.port });
                    resolve();
                });

                // Start periodic status broadcasts
                this.startStatusBroadcast();

            } catch (error) {
                this.log('error', 'Failed to start dashboard', { error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Broadcast status updates to all connected clients
     */
    startStatusBroadcast() {
        setInterval(() => {
            if (this.clients.size > 0) {
                this.broadcast({
                    type: 'status',
                    data: this.getBotStatus()
                });
            }
        }, 2000); // Update every 2 seconds
    }

    /**
     * Broadcast message to all connected WebSocket clients
     */
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    /**
     * Stop the dashboard server
     */
    stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            this.server.close();
        }
        this.log('info', 'Dashboard server stopped');
        console.log('✓ Dashboard server stopped');
    }
}

module.exports = Dashboard;

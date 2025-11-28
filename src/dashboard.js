const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { DeltaSync, throttle } = require('./core/CacheUtils');

/**
 * Enhanced Logging & Monitoring Dashboard
 * Web-based visibility into bot operations with real-time updates
 * Optimized with delta-based sync to reduce bandwidth
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
        this.latestCameraData = null;
        this.cameraUpdateInterval = null;
        
        // Delta sync for optimized updates
        this.statusDeltaSync = new DeltaSync();
        this.cameraDeltaSync = new DeltaSync();
        
        // Track intervals for cleanup
        this.statusBroadcastIntervals = [];
        
        // Initialize winston logger
        this.initializeLogger();
        
        // Setup Express middleware
        this.app.use(cors());
        this.app.use(express.json());
        
        // Setup routes
        this.setupRoutes();
        
        // Serve static frontend files
        this.serveStaticFiles();
    }

    /**
     * Serve static frontend files
     */
    serveStaticFiles() {
        const frontendBuildPath = path.join(__dirname, '../frontend/dist');
        
        // Check if build directory exists
        if (fs.existsSync(frontendBuildPath)) {
            // Serve static files from the frontend build
            this.app.use(express.static(frontendBuildPath));
            
            // Handle client-side routing - serve index.html for all non-API routes
            // Note: Rate limiting not applied to static file serving as this is a local dashboard
            // If exposing publicly, consider adding express-rate-limit middleware
            // Using regex to match all paths except /api/* routes (compatible with path-to-regexp v8+)
            this.app.get(/^\/(?!api\/).*$/, (req, res) => {
                res.sendFile(path.join(frontendBuildPath, 'index.html'));
            });
            
            console.log('✓ Serving frontend from:', frontendBuildPath);
        } else {
            console.warn('⚠ Frontend build not found. Run "cd frontend && npm run build" to build the frontend.');
            console.warn('  Frontend path:', frontendBuildPath);
        }
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

        // Get latest camera view data
        this.app.get('/api/camera', (req, res) => {
            try {
                if (!this.latestCameraData) {
                    return res.status(404).json({ error: 'No camera data available yet' });
                }
                
                res.json(this.latestCameraData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Send chat message to bot
        this.app.post('/api/chat', async (req, res) => {
            try {
                const { message } = req.body;
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }
                
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not connected' });
                }
                
                // Send message in game
                this.bot.chat(message);
                
                this.log('info', 'Chat message sent', { message });
                res.json({ success: true, message: 'Message sent' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
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

                // Start camera view capture (real-time updates every 2 seconds)
                this.startCameraCapture();

                // Listen for chat messages from the game
                this.setupChatListener();

            } catch (error) {
                this.log('error', 'Failed to start dashboard', { error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Listen for chat messages from the game and broadcast to clients
     */
    setupChatListener() {
        if (!this.bot) return;

        this.bot.on('chat', (username, message) => {
            // Don't echo messages from the bot itself
            if (username === this.bot.username) return;

            const chatMessage = {
                username,
                message,
                timestamp: new Date().toISOString()
            };

            // Broadcast to WebSocket clients
            this.broadcast({
                type: 'chat',
                data: chatMessage
            });

            // Also emit via EventBus for Socket.IO clients
            if (this.systems.eventBus) {
                this.systems.eventBus.emit('bot:chat', chatMessage);
            }

            this.log('info', 'Chat message received', { username, message });
        });

        console.log('✓ Chat listener initialized');
    }

    /**
     * Start real-time camera capture
     * Provides live view of what the bot sees
     */
    startCameraCapture() {
        // Capture camera view every 2 seconds for real-time updates
        this.cameraUpdateInterval = setInterval(async () => {
            try {
                await this.captureCameraView();
            } catch (error) {
                this.log('error', 'Failed to capture camera view', { error: error.message });
            }
        }, 2000); // Every 2 seconds for real-time feel

        // Capture initial view after 1 second
        setTimeout(() => {
            this.captureCameraView().catch(err => {
                this.log('warn', 'Initial camera capture failed', { error: err.message });
            });
        }, 1000);
    }

    /**
     * Capture a comprehensive view of what the bot sees
     * This replaces the old screenshot system with live camera data
     */
    async captureCameraView() {
        if (!this.bot || !this.bot.entity) {
            return;
        }

        try {
            const pos = this.bot.entity.position;
            const yaw = this.bot.entity.yaw;
            const pitch = this.bot.entity.pitch;

            // Create comprehensive camera data
            const cameraData = {
                timestamp: Date.now(),
                bot: {
                    position: {
                        x: Math.round(pos.x * 100) / 100,
                        y: Math.round(pos.y * 100) / 100,
                        z: Math.round(pos.z * 100) / 100
                    },
                    rotation: {
                        yaw: Math.round(yaw * 100) / 100,
                        pitch: Math.round(pitch * 100) / 100,
                        direction: this.getDirection(yaw)
                    },
                    health: this.bot.health,
                    food: this.bot.food,
                    oxygen: this.bot.oxygenLevel || 20,
                    isOnGround: this.bot.entity.onGround,
                    velocity: {
                        x: Math.round((this.bot.entity.velocity?.x || 0) * 100) / 100,
                        y: Math.round((this.bot.entity.velocity?.y || 0) * 100) / 100,
                        z: Math.round((this.bot.entity.velocity?.z || 0) * 100) / 100
                    }
                },
                environment: {
                    time: this.bot.time?.timeOfDay || 0,
                    isDay: this.bot.time?.timeOfDay < 13000,
                    raining: this.bot.isRaining || false,
                    dimension: this.bot.game?.dimension || 'overworld',
                    biome: this.getBiomeAt(pos)
                },
                view: {
                    nearbyEntities: this.getNearbyEntities(32),
                    nearbyPlayers: this.getNearbyPlayers(64),
                    groundBlocks: this.getGroundBlocks(8),
                    visibleBlocks: this.getVisibleBlocks(16),
                    threats: this.detectThreats()
                }
            };

            // Store latest camera data
            this.latestCameraData = cameraData;

            // Broadcast to connected clients via WebSocket
            this.broadcast({
                type: 'camera',
                data: cameraData
            });

            // Also emit via EventBus for Socket.IO clients
            if (this.systems.eventBus) {
                this.systems.eventBus.emit('bot:camera', cameraData);
            }
        } catch (error) {
            this.log('error', 'Camera capture failed', { error: error.message });
        }
    }

    /**
     * Get cardinal direction from yaw
     * In Minecraft/Mineflayer: yaw is in radians
     * yaw = 0 means facing South, increases counter-clockwise
     */
    getDirection(yaw) {
        // Convert from radians to degrees and normalize to 0-360
        // Mineflayer yaw: 0 = South, π/2 = West, π = North, -π/2 = East
        const degrees = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
        
        // Minecraft cardinal directions based on yaw
        if (degrees >= 315 || degrees < 45) return 'South';
        if (degrees >= 45 && degrees < 135) return 'West';
        if (degrees >= 135 && degrees < 225) return 'North';
        return 'East';
    }

    /**
     * Get biome at position
     */
    getBiomeAt(pos) {
        try {
            const block = this.bot.blockAt(pos);
            if (block && block.biome) {
                return block.biome.name || 'unknown';
            }
            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Get nearby entities with detailed info
     */
    getNearbyEntities(radius) {
        const entities = [];
        const botPos = this.bot.entity.position;
        
        for (const entity of Object.values(this.bot.entities)) {
            if (entity === this.bot.entity || !entity.position) continue;
            
            const distance = botPos.distanceTo(entity.position);
            if (distance > radius) continue;

            const entityInfo = {
                type: entity.type,
                name: entity.name || entity.displayName || entity.type,
                id: entity.id,
                distance: Math.round(distance * 10) / 10,
                position: {
                    x: Math.round(entity.position.x),
                    y: Math.round(entity.position.y),
                    z: Math.round(entity.position.z)
                },
                health: entity.health,
                hostile: this.isHostile(entity)
            };

            entities.push(entityInfo);
        }

        // Sort by distance
        entities.sort((a, b) => a.distance - b.distance);
        return entities.slice(0, 20); // Limit to 20 nearest
    }

    /**
     * Get nearby players
     */
    getNearbyPlayers(radius) {
        const players = [];
        const botPos = this.bot.entity.position;

        for (const player of Object.values(this.bot.players)) {
            if (!player.entity || player.username === this.bot.username) continue;
            
            const distance = botPos.distanceTo(player.entity.position);
            if (distance > radius) continue;

            players.push({
                username: player.username,
                distance: Math.round(distance * 10) / 10,
                position: {
                    x: Math.round(player.entity.position.x),
                    y: Math.round(player.entity.position.y),
                    z: Math.round(player.entity.position.z)
                },
                ping: player.ping
            });
        }

        return players.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Check if entity is hostile
     */
    isHostile(entity) {
        const hostileMobs = [
            'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
            'enderman', 'witch', 'slime', 'phantom', 'drowned',
            'husk', 'stray', 'vindicator', 'pillager', 'ravager',
            'evoker', 'vex', 'blaze', 'ghast', 'magma_cube',
            'hoglin', 'piglin_brute', 'warden', 'wither_skeleton'
        ];
        
        const name = (entity.name || entity.type || '').toLowerCase();
        return hostileMobs.some(mob => name.includes(mob));
    }

    /**
     * Get ground blocks in a grid pattern
     */
    getGroundBlocks(radius) {
        const blocks = [];
        const pos = this.bot.entity.position;
        
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                // Find ground level at this x,z
                for (let y = 3; y >= -3; y--) {
                    const block = this.bot.blockAt(pos.offset(x, y, z));
                    if (block && block.name !== 'air') {
                        blocks.push({
                            name: block.name,
                            relX: x,
                            relY: y,
                            relZ: z,
                            position: {
                                x: Math.round(block.position.x),
                                y: Math.round(block.position.y),
                                z: Math.round(block.position.z)
                            }
                        });
                        break; // Only get the top block at each x,z
                    }
                }
            }
        }
        
        return blocks;
    }

    /**
     * Get visible blocks in front of the bot (in view direction)
     */
    getVisibleBlocks(distance) {
        const blocks = [];
        const pos = this.bot.entity.position;
        const yaw = this.bot.entity.yaw;
        
        // Calculate direction vector from yaw
        const dirX = -Math.sin(yaw);
        const dirZ = Math.cos(yaw);
        
        // Scan in front of the bot
        for (let d = 1; d <= distance; d++) {
            const checkX = Math.round(pos.x + dirX * d);
            const checkZ = Math.round(pos.z + dirZ * d);
            
            // Check multiple heights
            for (let y = -2; y <= 4; y++) {
                const block = this.bot.blockAt({ x: checkX, y: pos.y + y, z: checkZ });
                if (block && block.name !== 'air') {
                    blocks.push({
                        name: block.name,
                        distance: d,
                        relY: y,
                        position: {
                            x: checkX,
                            y: Math.round(pos.y + y),
                            z: checkZ
                        }
                    });
                }
            }
        }
        
        return blocks.slice(0, 50); // Limit results
    }

    /**
     * Detect nearby threats
     */
    detectThreats() {
        const threats = [];
        const botPos = this.bot.entity.position;
        
        // Check for hostile mobs
        for (const entity of Object.values(this.bot.entities)) {
            if (entity === this.bot.entity || !entity.position) continue;
            
            if (this.isHostile(entity)) {
                const distance = botPos.distanceTo(entity.position);
                if (distance < 16) {
                    threats.push({
                        type: 'hostile_mob',
                        name: entity.name || entity.type,
                        distance: Math.round(distance * 10) / 10,
                        severity: distance < 5 ? 'high' : distance < 10 ? 'medium' : 'low'
                    });
                }
            }
        }

        // Check for dangerous blocks (lava, fire)
        const dangerBlocks = ['lava', 'fire', 'magma_block', 'cactus', 'sweet_berry_bush'];
        for (let x = -3; x <= 3; x++) {
            for (let y = -2; y <= 2; y++) {
                for (let z = -3; z <= 3; z++) {
                    const block = this.bot.blockAt(botPos.offset(x, y, z));
                    if (block && dangerBlocks.includes(block.name)) {
                        const distance = Math.sqrt(x*x + y*y + z*z);
                        threats.push({
                            type: 'dangerous_block',
                            name: block.name,
                            distance: Math.round(distance * 10) / 10,
                            severity: distance < 2 ? 'high' : 'medium'
                        });
                    }
                }
            }
        }

        // Check health status
        if (this.bot.health < 6) {
            threats.push({
                type: 'low_health',
                name: 'Critical Health',
                distance: 0,
                severity: 'high'
            });
        } else if (this.bot.health < 10) {
            threats.push({
                type: 'low_health',
                name: 'Low Health',
                distance: 0,
                severity: 'medium'
            });
        }

        // Check food status
        if (this.bot.food < 6) {
            threats.push({
                type: 'low_food',
                name: 'Hunger',
                distance: 0,
                severity: this.bot.food < 3 ? 'high' : 'medium'
            });
        }

        return threats.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Broadcast status updates to all connected clients
     * Uses delta-based sync to only send changed data
     */
    startStatusBroadcast() {
        const deltaInterval = setInterval(() => {
            if (this.clients.size > 0) {
                const status = this.getBotStatus();
                const delta = this.statusDeltaSync.getDelta(status);
                
                // Only broadcast if there are changes
                if (delta) {
                    this.broadcast({
                        type: 'status_delta',
                        data: delta,
                        fullRefresh: false
                    });
                }
            }
        }, 2000); // Update every 2 seconds
        this.statusBroadcastIntervals.push(deltaInterval);
        
        // Send full status periodically to ensure sync
        const fullInterval = setInterval(() => {
            if (this.clients.size > 0) {
                this.broadcast({
                    type: 'status',
                    data: this.getBotStatus()
                });
            }
        }, 30000); // Full refresh every 30 seconds
        this.statusBroadcastIntervals.push(fullInterval);
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
     * Broadcast delta-optimized camera data
     */
    broadcastCameraDelta(cameraData) {
        const delta = this.cameraDeltaSync.getDelta(cameraData);
        
        if (delta) {
            this.broadcast({
                type: 'camera_delta',
                data: delta,
                fullRefresh: false
            });
        }
    }

    /**
     * Stop the dashboard server
     */
    stop() {
        // Clear status broadcast intervals
        for (const interval of this.statusBroadcastIntervals) {
            clearInterval(interval);
        }
        this.statusBroadcastIntervals = [];
        
        if (this.cameraUpdateInterval) {
            clearInterval(this.cameraUpdateInterval);
            this.cameraUpdateInterval = null;
        }
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

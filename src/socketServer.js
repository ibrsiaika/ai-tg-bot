/**
 * Socket.IO Server - v4.1.0
 * Real-time communication between bot and dashboard
 */

const { Server } = require('socket.io');

class SocketIOServer {
    constructor(options = {}) {
        this.enabled = process.env.SOCKETIO_ENABLED === 'true';
        this.port = parseInt(process.env.SOCKETIO_PORT) || 3002;
        this.io = null;
        this.bot = null;
        this.eventBus = null; // Will be set via setEventBus
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        try {
            this.io = new Server(this.port, {
                cors: {
                    origin: process.env.DASHBOARD_HOST || 'http://localhost:3001',
                    methods: ['GET', 'POST']
                },
                transports: ['websocket', 'polling']
            });
            
            this.setupEventHandlers();
            
            console.log(`[Socket.IO] ✓ Server running on port ${this.port}`);
        } catch (error) {
            console.error('[Socket.IO] Initialization error:', error.message);
            this.enabled = false;
        }
    }
    
    /**
     * Set the EventBus instance for listening to events
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
        this.setupBotListeners();
    }
    
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('[Socket.IO] Client connected:', socket.id);
            
            // Send initial state
            this.sendBotUpdate(socket);
            
            // Handle commands from dashboard
            socket.on('command', (data) => {
                this.handleCommand(data, socket);
            });
            
            socket.on('disconnect', () => {
                console.log('[Socket.IO] Client disconnected:', socket.id);
            });
        });
    }
    
    setupBotListeners() {
        // Don't set up listeners if EventBus is not set yet
        if (!this.eventBus) {
            console.log('[Socket.IO] Waiting for EventBus to be set...');
            return;
        }
        
        // Listen to bot events via EventBus instance
        this.eventBus.on('bot:health', (data) => {
            this.broadcast('bot:health', data);
        });
        
        this.eventBus.on('bot:position', (data) => {
            this.broadcast('bot:position', data);
        });
        
        this.eventBus.on('bot:inventory', (data) => {
            this.broadcast('bot:inventory', data);
        });
        
        this.eventBus.on('bot:systems', (data) => {
            this.broadcast('bot:systems', data);
        });
        
        this.eventBus.on('bot:gameview', (data) => {
            this.broadcast('bot:gameview', data);
        });
        
        this.eventBus.on('bot:chat', (data) => {
            this.broadcast('bot:chat', data);
        });
        
        this.eventBus.on('bot:action', (data) => {
            this.broadcast('bot:log', {
                level: 'info',
                message: `Action: ${data.action}`,
                timestamp: new Date().toISOString()
            });
        });
        
        this.eventBus.on('ml:prediction', (data) => {
            this.broadcast('bot:log', {
                level: 'debug',
                message: `ML Prediction: ${data.result?.action} (${Math.round(data.result?.confidence * 100)}%)`,
                timestamp: new Date().toISOString()
            });
        });
        
        this.eventBus.on('bot:error', (data) => {
            this.broadcast('bot:log', {
                level: 'error',
                message: data.message,
                timestamp: new Date().toISOString()
            });
        });
        
        console.log('[Socket.IO] Event listeners registered');
    }
    
    attachBot(bot) {
        this.bot = bot;
        
        if (!this.enabled || !bot || !this.eventBus) return;
        
        // Set up bot event listeners to emit to EventBus
        bot.on('health', () => {
            this.eventBus.emit('bot:health', {
                value: bot.health / 20,
                food: bot.food / 20
            });
        });
        
        bot.on('move', () => {
            if (bot.entity) {
                this.eventBus.emit('bot:position', bot.entity.position);
            }
        });
        
        bot.on('physicsTick', () => {
            // Send periodic updates (throttled)
            if (Date.now() % 1000 < 50) { // Every ~1 second
                this.sendPeriodicUpdate();
            }
        });
    }
    
    sendBotUpdate(socket = null) {
        if (!this.bot) return;
        
        const update = {
            health: this.bot.health / 20,
            food: this.bot.food / 20,
            position: this.bot.entity?.position,
            inventory: this.getInventoryData(),
            systems: this.getSystemsStatus(),
        };
        
        if (socket) {
            socket.emit('bot:update', update);
        } else {
            this.broadcast('bot:update', update);
        }
    }
    
    sendPeriodicUpdate() {
        if (!this.bot) return;
        
        this.broadcast('bot:health', {
            value: this.bot.health / 20,
            food: this.bot.food / 20
        });
        
        if (this.bot.entity) {
            this.broadcast('bot:position', this.bot.entity.position);
        }
    }
    
    getInventoryData() {
        if (!this.bot?.inventory) return [];
        
        return this.bot.inventory.items().map(item => ({
            name: item.name,
            count: item.count,
            slot: item.slot
        }));
    }
    
    getSystemsStatus() {
        return {
            eventBus: 'online',
            pathfinding: 'online',
            inventory: 'online',
            safety: 'online',
            combat: 'idle',
            mining: 'idle',
            farming: 'idle',
            building: 'idle',
            telegram: process.env.TELEGRAM_BOT_TOKEN ? 'online' : 'offline',
            mlEngine: process.env.ML_ENABLED === 'true' ? 'online' : 'offline'
        };
    }
    
    handleCommand(data, socket) {
        console.log('[Socket.IO] Received command:', data);
        
        if (!this.bot) {
            socket.emit('command:error', { message: 'Bot not connected' });
            return;
        }
        
        // Emit command event for bot systems to handle
        if (this.eventBus) {
            this.eventBus.emit('dashboard:command', data);
        }
        
        socket.emit('command:success', {
            command: data.command,
            timestamp: Date.now()
        });
        
        this.broadcast('bot:log', {
            level: 'info',
            message: `Command received: ${data.command}`,
            timestamp: new Date().toISOString()
        });
    }
    
    broadcast(event, data) {
        if (!this.enabled || !this.io) return;
        this.io.emit(event, data);
    }
    
    close() {
        if (this.io) {
            this.io.close();
            console.log('[Socket.IO] Server closed');
        }
    }
}

module.exports = SocketIOServer;

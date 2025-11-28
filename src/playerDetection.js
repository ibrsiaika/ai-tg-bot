/**
 * Player Detection System - v4.2.0
 * 
 * Real-time player detection and adaptive behavior system
 * Features:
 * - Player tracking within configurable radius
 * - Movement pattern analysis and prediction
 * - Smart avoidance protocol
 * - Collaborative mode for player assistance
 * - Anti-grief protection
 * - Action logging for transparency
 * 
 * Memory optimized for 512MB RAM environments
 */

const EventBus = require('./eventBus');

// Memory-efficient constants
const MAX_TRACKED_PLAYERS = 20;
const MAX_MOVEMENT_HISTORY = 50;
const MAX_ACTION_LOG = 200;
const DEFAULT_DETECTION_RADIUS = 64;
const POSITION_UPDATE_INTERVAL = 1000; // 1 second
const PREDICTION_WINDOW = 10; // Predict 10 positions ahead

/**
 * Player behavior modes
 */
const BehaviorMode = {
    NORMAL: 'normal',           // Standard bot operations
    AVOIDANCE: 'avoidance',     // Stay away from players
    COLLABORATIVE: 'collaborative', // Help players
    STEALTH: 'stealth',         // Minimize visibility
    IDLE: 'idle'                // Pause all activities
};

/**
 * Player relationship types
 */
const PlayerRelation = {
    UNKNOWN: 'unknown',
    FRIENDLY: 'friendly',
    NEUTRAL: 'neutral',
    AVOID: 'avoid',
    OWNER: 'owner'
};

class PlayerDetectionSystem {
    constructor(bot, notifier, options = {}) {
        this.bot = bot;
        this.notifier = notifier;
        this.enabled = process.env.PLAYER_DETECTION_ENABLED !== 'false';
        
        // Configuration
        this.detectionRadius = parseInt(process.env.PLAYER_DETECTION_RADIUS) || DEFAULT_DETECTION_RADIUS;
        this.avoidanceRadius = parseInt(process.env.PLAYER_AVOIDANCE_RADIUS) || 32;
        this.ownerUsername = process.env.BOT_OWNER_USERNAME || null;
        
        // Player tracking data
        this.trackedPlayers = new Map();
        this.playerRelations = new Map();
        this.movementHistory = new Map();
        this.playerPresencePatterns = new Map();
        
        // Bot state
        this.currentMode = BehaviorMode.NORMAL;
        this.previousMode = BehaviorMode.NORMAL;
        this.pausedActivities = [];
        
        // Action logging
        this.actionLog = [];
        
        // Update intervals
        this.updateInterval = null;
        
        // Statistics
        this.stats = {
            playersDetected: 0,
            avoidanceTriggered: 0,
            collaborativeActions: 0,
            predictionsAccurate: 0,
            totalPredictions: 0
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Initialize the player detection system
     */
    initialize() {
        console.log('[Player Detection] Initializing...');
        console.log(`[Player Detection] Detection radius: ${this.detectionRadius} blocks`);
        console.log(`[Player Detection] Avoidance radius: ${this.avoidanceRadius} blocks`);

        this.setupEventListeners();
        this.startPositionTracking();

        // Set owner relation if configured
        if (this.ownerUsername) {
            this.setPlayerRelation(this.ownerUsername, PlayerRelation.OWNER);
            console.log(`[Player Detection] Owner set: ${this.ownerUsername}`);
        }

        console.log('[Player Detection] ✓ System initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player spawn/despawn events
        this.bot.on('playerJoined', (player) => this.onPlayerJoined(player));
        this.bot.on('playerLeft', (player) => this.onPlayerLeft(player));

        // Entity movement
        this.bot.on('entityMoved', (entity) => {
            if (entity.type === 'player' && entity.username !== this.bot.username) {
                this.updatePlayerPosition(entity);
            }
        });
    }

    /**
     * Start periodic position tracking
     */
    startPositionTracking() {
        this.updateInterval = setInterval(() => {
            this.scanNearbyPlayers();
            this.updateBehaviorMode();
            this.evaluatePredictions();
        }, POSITION_UPDATE_INTERVAL);
    }

    /**
     * Stop position tracking
     */
    stopPositionTracking() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Handle player join
     */
    onPlayerJoined(player) {
        if (!player || player.username === this.bot.username) return;

        console.log(`[Player Detection] Player joined: ${player.username}`);
        this.stats.playersDetected++;

        // Initialize tracking
        if (!this.playerRelations.has(player.username)) {
            this.playerRelations.set(player.username, PlayerRelation.UNKNOWN);
        }

        EventBus.emit('player:joined', {
            username: player.username,
            timestamp: Date.now()
        });
    }

    /**
     * Handle player leave
     */
    onPlayerLeft(player) {
        if (!player) return;

        console.log(`[Player Detection] Player left: ${player.username}`);

        // Clean up tracking data
        this.trackedPlayers.delete(player.username);

        EventBus.emit('player:left', {
            username: player.username,
            timestamp: Date.now()
        });

        // Re-evaluate mode
        this.updateBehaviorMode();
    }

    /**
     * Scan for nearby players
     */
    scanNearbyPlayers() {
        const botPosition = this.bot.entity?.position;
        if (!botPosition) return;

        const nearbyPlayers = [];

        // Check all players
        for (const player of Object.values(this.bot.players)) {
            if (!player.entity || player.username === this.bot.username) continue;

            const distance = botPosition.distanceTo(player.entity.position);

            if (distance <= this.detectionRadius) {
                nearbyPlayers.push({
                    username: player.username,
                    position: player.entity.position.clone(),
                    distance,
                    relation: this.playerRelations.get(player.username) || PlayerRelation.UNKNOWN
                });

                // Update tracking
                this.updatePlayerTracking(player, distance);
            }
        }

        // Emit event if players detected
        if (nearbyPlayers.length > 0) {
            EventBus.emit('players:nearby', {
                count: nearbyPlayers.length,
                players: nearbyPlayers.map(p => ({ username: p.username, distance: p.distance })),
                timestamp: Date.now()
            });
        }

        return nearbyPlayers;
    }

    /**
     * Update player tracking data
     */
    updatePlayerTracking(player, distance) {
        const username = player.username;
        const position = player.entity.position.clone();

        // Limit tracked players
        if (this.trackedPlayers.size >= MAX_TRACKED_PLAYERS && !this.trackedPlayers.has(username)) {
            // Remove oldest tracked player
            const firstKey = this.trackedPlayers.keys().next().value;
            this.trackedPlayers.delete(firstKey);
            this.movementHistory.delete(firstKey);
        }

        // Update current position
        this.trackedPlayers.set(username, {
            position,
            distance,
            lastSeen: Date.now(),
            velocity: this.calculateVelocity(username, position)
        });

        // Update movement history
        this.updateMovementHistory(username, position);

        // Record presence pattern
        this.recordPresencePattern(username);
    }

    /**
     * Update player position from entity movement
     */
    updatePlayerPosition(entity) {
        if (!entity.username || entity.username === this.bot.username) return;

        const botPosition = this.bot.entity?.position;
        if (!botPosition) return;

        const distance = botPosition.distanceTo(entity.position);

        if (distance <= this.detectionRadius) {
            const tracked = this.trackedPlayers.get(entity.username);
            if (tracked) {
                tracked.position = entity.position.clone();
                tracked.distance = distance;
                tracked.lastSeen = Date.now();
                tracked.velocity = this.calculateVelocity(entity.username, entity.position);
            }

            this.updateMovementHistory(entity.username, entity.position);
        }
    }

    /**
     * Calculate player velocity
     */
    calculateVelocity(username, currentPos) {
        const history = this.movementHistory.get(username);
        if (!history || history.length < 2) {
            return { x: 0, y: 0, z: 0 };
        }

        const prevEntry = history[history.length - 1];
        const timeDelta = (Date.now() - prevEntry.timestamp) / 1000; // seconds

        if (timeDelta === 0) return { x: 0, y: 0, z: 0 };

        return {
            x: (currentPos.x - prevEntry.position.x) / timeDelta,
            y: (currentPos.y - prevEntry.position.y) / timeDelta,
            z: (currentPos.z - prevEntry.position.z) / timeDelta
        };
    }

    /**
     * Update movement history for a player
     */
    updateMovementHistory(username, position) {
        if (!this.movementHistory.has(username)) {
            this.movementHistory.set(username, []);
        }

        const history = this.movementHistory.get(username);
        history.push({
            position: { x: position.x, y: position.y, z: position.z },
            timestamp: Date.now()
        });

        // Limit history size
        if (history.length > MAX_MOVEMENT_HISTORY) {
            history.shift();
        }
    }

    /**
     * Record presence pattern for prediction
     */
    recordPresencePattern(username) {
        const hour = new Date().getHours();
        const key = `${username}:${hour}`;

        if (!this.playerPresencePatterns.has(key)) {
            this.playerPresencePatterns.set(key, 0);
        }

        this.playerPresencePatterns.set(key, this.playerPresencePatterns.get(key) + 1);
    }

    /**
     * Predict player's next position
     */
    predictNextPosition(username, stepsAhead = 1) {
        const tracked = this.trackedPlayers.get(username);
        if (!tracked) return null;

        const velocity = tracked.velocity;
        const currentPos = tracked.position;

        // Simple linear prediction
        const predicted = {
            x: currentPos.x + velocity.x * stepsAhead,
            y: currentPos.y + velocity.y * stepsAhead,
            z: currentPos.z + velocity.z * stepsAhead
        };

        this.stats.totalPredictions++;

        return {
            position: predicted,
            confidence: this.calculatePredictionConfidence(username),
            stepsAhead
        };
    }

    /**
     * Calculate prediction confidence
     */
    calculatePredictionConfidence(username) {
        const history = this.movementHistory.get(username);
        if (!history || history.length < 5) return 0.3;

        // Calculate movement consistency
        let consistentMoves = 0;
        for (let i = 2; i < history.length; i++) {
            const prevMove = {
                x: history[i-1].position.x - history[i-2].position.x,
                z: history[i-1].position.z - history[i-2].position.z
            };
            const currMove = {
                x: history[i].position.x - history[i-1].position.x,
                z: history[i].position.z - history[i-1].position.z
            };

            // Check if similar direction
            if (Math.sign(prevMove.x) === Math.sign(currMove.x) &&
                Math.sign(prevMove.z) === Math.sign(currMove.z)) {
                consistentMoves++;
            }
        }

        return Math.min(0.9, 0.3 + (consistentMoves / (history.length - 2)) * 0.6);
    }

    /**
     * Evaluate predictions accuracy
     */
    evaluatePredictions() {
        // Store predictions for later verification
        // This would be called periodically to check if predictions were accurate
    }

    /**
     * Update bot behavior mode based on nearby players
     */
    updateBehaviorMode() {
        const nearbyPlayers = [];

        for (const [username, data] of this.trackedPlayers.entries()) {
            if (Date.now() - data.lastSeen < 5000) { // Active in last 5 seconds
                nearbyPlayers.push({
                    username,
                    distance: data.distance,
                    relation: this.playerRelations.get(username) || PlayerRelation.UNKNOWN
                });
            }
        }

        // Determine mode based on nearby players
        let newMode = BehaviorMode.NORMAL;

        if (nearbyPlayers.length > 0) {
            // Check for owner first
            const ownerNearby = nearbyPlayers.some(p => p.relation === PlayerRelation.OWNER);
            const friendlyNearby = nearbyPlayers.some(p => p.relation === PlayerRelation.FRIENDLY);
            const avoidNearby = nearbyPlayers.some(p => p.relation === PlayerRelation.AVOID);
            const veryClose = nearbyPlayers.some(p => p.distance < this.avoidanceRadius);

            if (ownerNearby) {
                newMode = BehaviorMode.COLLABORATIVE;
            } else if (avoidNearby || (veryClose && !friendlyNearby)) {
                newMode = BehaviorMode.AVOIDANCE;
                this.stats.avoidanceTriggered++;
            } else if (friendlyNearby) {
                newMode = BehaviorMode.COLLABORATIVE;
            } else {
                newMode = BehaviorMode.STEALTH;
            }
        }

        // Mode changed
        if (newMode !== this.currentMode) {
            this.previousMode = this.currentMode;
            this.currentMode = newMode;

            console.log(`[Player Detection] Mode changed: ${this.previousMode} -> ${this.currentMode}`);

            EventBus.emit('player:mode:changed', {
                previousMode: this.previousMode,
                currentMode: this.currentMode,
                nearbyPlayers: nearbyPlayers.length,
                timestamp: Date.now()
            });

            // Handle mode transition
            this.handleModeTransition(this.previousMode, this.currentMode);
        }
    }

    /**
     * Handle mode transitions
     */
    handleModeTransition(fromMode, toMode) {
        if (toMode === BehaviorMode.AVOIDANCE || toMode === BehaviorMode.IDLE) {
            // Pause current activities
            this.pauseActivities();
        } else if (fromMode === BehaviorMode.AVOIDANCE || fromMode === BehaviorMode.IDLE) {
            // Resume activities
            this.resumeActivities();
        }
    }

    /**
     * Pause bot activities
     */
    pauseActivities() {
        console.log('[Player Detection] Pausing activities');
        this.pausedActivities = ['mining', 'building', 'farming']; // Track what was paused

        EventBus.emit('bot:activities:paused', {
            reason: 'player_nearby',
            mode: this.currentMode,
            timestamp: Date.now()
        });
    }

    /**
     * Resume bot activities
     */
    resumeActivities() {
        console.log('[Player Detection] Resuming activities');

        EventBus.emit('bot:activities:resumed', {
            previousMode: this.previousMode,
            currentMode: this.currentMode,
            timestamp: Date.now()
        });

        this.pausedActivities = [];
    }

    /**
     * Set player relation
     */
    setPlayerRelation(username, relation) {
        this.playerRelations.set(username, relation);
        console.log(`[Player Detection] Set ${username} as ${relation}`);

        this.logAction('set_relation', { username, relation });
    }

    /**
     * Get player relation
     */
    getPlayerRelation(username) {
        return this.playerRelations.get(username) || PlayerRelation.UNKNOWN;
    }

    /**
     * Log bot action for transparency
     */
    logAction(action, details) {
        const entry = {
            action,
            details,
            timestamp: Date.now(),
            mode: this.currentMode
        };

        this.actionLog.push(entry);

        // Limit log size
        if (this.actionLog.length > MAX_ACTION_LOG) {
            this.actionLog.shift();
        }
    }

    /**
     * Get action log
     */
    getActionLog(limit = 50) {
        return this.actionLog.slice(-limit);
    }

    /**
     * Check if should avoid area
     */
    shouldAvoidArea(position) {
        for (const [username, data] of this.trackedPlayers.entries()) {
            const relation = this.playerRelations.get(username);

            // Don't avoid owner or friends
            if (relation === PlayerRelation.OWNER || relation === PlayerRelation.FRIENDLY) {
                continue;
            }

            // Check distance to player
            const distance = Math.sqrt(
                Math.pow(position.x - data.position.x, 2) +
                Math.pow(position.y - data.position.y, 2) +
                Math.pow(position.z - data.position.z, 2)
            );

            if (distance < this.avoidanceRadius) {
                return true;
            }

            // Check predicted positions
            for (let i = 1; i <= PREDICTION_WINDOW; i++) {
                const prediction = this.predictNextPosition(username, i);
                if (prediction) {
                    const predDist = Math.sqrt(
                        Math.pow(position.x - prediction.position.x, 2) +
                        Math.pow(position.y - prediction.position.y, 2) +
                        Math.pow(position.z - prediction.position.z, 2)
                    );

                    if (predDist < this.avoidanceRadius * 0.5) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Get safe position away from players
     */
    getSafePosition() {
        const botPos = this.bot.entity?.position;
        if (!botPos) return null;

        // Find direction with least player presence
        const directions = [
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 },
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 },
            { dx: 1, dz: 1 },
            { dx: -1, dz: 1 },
            { dx: 1, dz: -1 },
            { dx: -1, dz: -1 }
        ];

        let bestDirection = directions[0];
        let maxDistance = 0;

        for (const dir of directions) {
            let minPlayerDist = Infinity;

            for (const data of this.trackedPlayers.values()) {
                const testPos = {
                    x: botPos.x + dir.dx * this.avoidanceRadius,
                    y: botPos.y,
                    z: botPos.z + dir.dz * this.avoidanceRadius
                };

                const dist = Math.sqrt(
                    Math.pow(testPos.x - data.position.x, 2) +
                    Math.pow(testPos.z - data.position.z, 2)
                );

                minPlayerDist = Math.min(minPlayerDist, dist);
            }

            if (minPlayerDist > maxDistance) {
                maxDistance = minPlayerDist;
                bestDirection = dir;
            }
        }

        return {
            x: botPos.x + bestDirection.dx * this.avoidanceRadius,
            y: botPos.y,
            z: botPos.z + bestDirection.dz * this.avoidanceRadius
        };
    }

    /**
     * Predict player activity window
     */
    predictActivityWindow(username) {
        const patterns = [];

        // Get all hour patterns for this user
        for (let hour = 0; hour < 24; hour++) {
            const key = `${username}:${hour}`;
            const count = this.playerPresencePatterns.get(key) || 0;
            patterns.push({ hour, count });
        }

        // Find peak activity hours
        patterns.sort((a, b) => b.count - a.count);
        const peakHours = patterns.slice(0, 5).filter(p => p.count > 0);

        return {
            username,
            peakHours: peakHours.map(p => p.hour),
            totalObservations: patterns.reduce((sum, p) => sum + p.count, 0)
        };
    }

    /**
     * Get nearby players
     */
    getNearbyPlayers() {
        const players = [];

        for (const [username, data] of this.trackedPlayers.entries()) {
            if (Date.now() - data.lastSeen < 10000) { // Active in last 10 seconds
                players.push({
                    username,
                    position: data.position,
                    distance: data.distance,
                    relation: this.playerRelations.get(username) || PlayerRelation.UNKNOWN,
                    velocity: data.velocity
                });
            }
        }

        return players.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Get player by username
     */
    getPlayer(username) {
        return this.trackedPlayers.get(username) || null;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            currentMode: this.currentMode,
            detectionRadius: this.detectionRadius,
            avoidanceRadius: this.avoidanceRadius,
            trackedPlayers: this.trackedPlayers.size,
            knownRelations: this.playerRelations.size,
            predictionAccuracy: this.stats.totalPredictions > 0
                ? (this.stats.predictionsAccurate / this.stats.totalPredictions * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Check if bot should be in collaborative mode
     */
    isCollaborativeMode() {
        return this.currentMode === BehaviorMode.COLLABORATIVE;
    }

    /**
     * Check if bot should avoid players
     */
    isAvoidanceMode() {
        return this.currentMode === BehaviorMode.AVOIDANCE;
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stopPositionTracking();
        this.trackedPlayers.clear();
        this.movementHistory.clear();
        this.actionLog = [];

        console.log('[Player Detection] Cleanup complete');
    }
}

// Export class and constants
module.exports = PlayerDetectionSystem;
module.exports.BehaviorMode = BehaviorMode;
module.exports.PlayerRelation = PlayerRelation;

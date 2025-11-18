const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

/**
 * Advanced Mob Threat AI System
 * - Scans 64-block radius for threats
 * - Implements danger scoring for different mob types
 * - Predicts when to retreat before mobs reach
 * - Provides mob avoidance routing
 */
class MobThreatAI {
    constructor(bot, pathfinder, notifier) {
        this.bot = bot;
        this.pathfinder = pathfinder;
        this.notifier = notifier;
        
        // Scan radius
        this.THREAT_SCAN_RADIUS = 64;
        this.IMMEDIATE_THREAT_RADIUS = 16;
        this.CRITICAL_THREAT_RADIUS = 8;
        
        // Mob danger scoring (higher = more dangerous)
        this.MOB_DANGER_SCORES = {
            'creeper': 100,        // CRITICAL - explosion damage
            'skeleton': 80,        // HIGH - arrow damage
            'wither_skeleton': 85, // HIGH - wither effect
            'spider': 60,          // MEDIUM - speed threat
            'cave_spider': 65,     // MEDIUM - poison effect
            'zombie': 40,          // LOW - basic threat
            'zombified_piglin': 45,// LOW - neutral unless provoked
            'enderman': 50,        // MEDIUM - high damage but neutral
            'phantom': 55,         // MEDIUM - flying threat
            'witch': 70,           // HIGH - potion attacks
            'blaze': 75,           // HIGH - fire damage
            'ghast': 85,           // HIGH - fireball attacks
            'piglin_brute': 90,    // CRITICAL - high damage
            'hoglin': 70,          // HIGH - charge attack
            'ravager': 95,         // CRITICAL - high damage & knockback
            'vindicator': 75,      // HIGH - axe damage
            'evoker': 80,          // HIGH - magic attacks
            'vex': 65,             // MEDIUM - small & fast
            'slime': 30,           // LOW
            'magma_cube': 35,      // LOW
            'silverfish': 25,      // LOW
            'guardian': 70,        // HIGH - laser damage
            'elder_guardian': 85,  // HIGH - mining fatigue
            'shulker': 75,         // HIGH - levitation
            'pillager': 75,        // HIGH - crossbow
            'drowned': 45          // LOW-MEDIUM - trident threat
        };
        
        // Threat history for learning
        this.threatHistory = [];
        this.MAX_THREAT_HISTORY = 100;
        
        // Danger zones (areas with frequent mob encounters)
        this.dangerZones = new Map(); // key: chunkKey, value: {count, lastSeen}
        
        // Retreat prediction
        this.lastRetreatTime = 0;
        this.RETREAT_COOLDOWN = 10000; // 10 seconds between retreats
    }
    
    /**
     * Scan for all mobs in extended radius
     */
    scanForThreats() {
        const nearbyEntities = Object.values(this.bot.entities);
        const threats = [];
        
        for (const entity of nearbyEntities) {
            if (!entity || !entity.position) continue;
            
            const distance = this.bot.entity.position.distanceTo(entity.position);
            
            // Check if within scan radius
            if (distance > this.THREAT_SCAN_RADIUS) continue;
            
            // Check if hostile
            const mobType = entity.name?.toLowerCase();
            if (!mobType || !this.MOB_DANGER_SCORES[mobType]) continue;
            
            // Calculate threat level
            const dangerScore = this.MOB_DANGER_SCORES[mobType];
            const distanceFactor = Math.max(0, (this.THREAT_SCAN_RADIUS - distance) / this.THREAT_SCAN_RADIUS);
            const threatLevel = dangerScore * distanceFactor;
            
            threats.push({
                entity: entity,
                type: mobType,
                distance: distance,
                dangerScore: dangerScore,
                threatLevel: threatLevel,
                position: entity.position.clone()
            });
        }
        
        // Sort by threat level (highest first)
        threats.sort((a, b) => b.threatLevel - a.threatLevel);
        
        return threats;
    }
    
    /**
     * Assess overall threat situation
     */
    assessThreatSituation() {
        const threats = this.scanForThreats();
        
        if (threats.length === 0) {
            return {
                level: 'SAFE',
                score: 0,
                threats: [],
                shouldRetreat: false,
                canFight: false
            };
        }
        
        // Calculate total threat score
        const totalThreatScore = threats.reduce((sum, t) => sum + t.threatLevel, 0);
        
        // Count by distance category
        const immediate = threats.filter(t => t.distance <= this.IMMEDIATE_THREAT_RADIUS);
        const critical = threats.filter(t => t.distance <= this.CRITICAL_THREAT_RADIUS);
        
        // Determine threat level
        let level = 'LOW';
        let shouldRetreat = false;
        let canFight = true;
        
        if (critical.length > 0) {
            level = 'CRITICAL';
            shouldRetreat = true;
            canFight = false;
        } else if (immediate.length >= 3) {
            level = 'HIGH';
            shouldRetreat = true;
            canFight = false;
        } else if (totalThreatScore > 150) {
            level = 'HIGH';
            shouldRetreat = true;
            canFight = false;
        } else if (immediate.length === 1 && immediate[0].dangerScore < 70) {
            level = 'MEDIUM';
            canFight = true;
        } else if (immediate.length > 0) {
            level = 'MEDIUM';
            shouldRetreat = immediate.some(t => t.dangerScore >= 80); // Retreat from high-danger mobs
            canFight = !shouldRetreat;
        }
        
        return {
            level: level,
            score: totalThreatScore,
            threats: threats,
            immediate: immediate,
            critical: critical,
            shouldRetreat: shouldRetreat,
            canFight: canFight,
            mostDangerous: threats[0] || null
        };
    }
    
    /**
     * Predict if we should retreat BEFORE mob reaches us
     */
    shouldPreemptivelyRetreat(botHealth) {
        const situation = this.assessThreatSituation();
        
        // Already determined we should retreat
        if (situation.shouldRetreat) {
            return true;
        }
        
        // Check for preemptive retreat conditions
        const healthPercent = (botHealth / 20) * 100;
        
        // Low health + any threats nearby
        if (healthPercent < 40 && situation.immediate.length > 0) {
            console.log('Preemptive retreat: low health with threats nearby');
            return true;
        }
        
        // Creeper approaching
        const creeper = situation.threats.find(t => t.type === 'creeper' && t.distance < 12);
        if (creeper) {
            console.log('Preemptive retreat: creeper approaching');
            return true;
        }
        
        // Multiple high-danger mobs approaching
        const highDangerApproaching = situation.threats.filter(
            t => t.dangerScore >= 70 && t.distance < 24
        );
        if (highDangerApproaching.length >= 2) {
            console.log('Preemptive retreat: multiple high-danger mobs approaching');
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute retreat to safety
     */
    async executeRetreat() {
        // Check cooldown
        if (Date.now() - this.lastRetreatTime < this.RETREAT_COOLDOWN) {
            console.log('Retreat on cooldown');
            return false;
        }
        
        console.log('Executing tactical retreat');
        this.lastRetreatTime = Date.now();
        
        const currentPos = this.bot.entity.position;
        const threats = this.scanForThreats();
        
        if (threats.length === 0) {
            return true;
        }
        
        // Calculate safe direction (away from threats)
        const safeDirection = this.calculateSafeDirection(threats);
        
        // Move 32 blocks in safe direction
        const retreatTarget = currentPos.offset(
            safeDirection.x * 32,
            0,
            safeDirection.z * 32
        );
        
        try {
            // Stop any existing pathfinding goal to prevent "goal was changed" errors
            this.bot.pathfinder.setGoal(null);
            
            await this.notifier.send('⚠️ Retreating from threats');
            
            const goal = new goals.GoalNear(retreatTarget.x, retreatTarget.y, retreatTarget.z, 5);
            await this.bot.pathfinder.goto(goal, { timeout: 15000 });
            
            console.log('Retreat successful');
            return true;
        } catch (error) {
            // Filter out "goal was changed" errors as they're expected when priorities shift
            if (!error.message?.includes('goal was changed')) {
                console.error('Retreat failed:', error.message);
            }
            return false;
        }
    }
    
    /**
     * Calculate direction away from threats
     */
    calculateSafeDirection(threats) {
        const currentPos = this.bot.entity.position;
        
        // Calculate average threat position
        let totalX = 0, totalZ = 0;
        for (const threat of threats) {
            totalX += threat.position.x;
            totalZ += threat.position.z;
        }
        
        const avgX = totalX / threats.length;
        const avgZ = totalZ / threats.length;
        
        // Direction away from threats
        const awayX = currentPos.x - avgX;
        const awayZ = currentPos.z - avgZ;
        
        // Normalize
        const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
        
        return {
            x: awayX / length,
            z: awayZ / length
        };
    }
    
    /**
     * Get mob avoidance route to destination
     * Returns waypoints that avoid known danger zones
     */
    getMobAvoidanceRoute(destination) {
        const currentPos = this.bot.entity.position;
        const threats = this.scanForThreats();
        
        if (threats.length === 0) {
            // No threats, direct route
            return [destination];
        }
        
        // Create waypoints that avoid immediate threats
        const waypoints = [];
        const numWaypoints = 3;
        
        for (let i = 1; i <= numWaypoints; i++) {
            const t = i / (numWaypoints + 1);
            let waypoint = new Vec3(
                currentPos.x + (destination.x - currentPos.x) * t,
                currentPos.y + (destination.y - currentPos.y) * t,
                currentPos.z + (destination.z - currentPos.z) * t
            );
            
            // Adjust waypoint to avoid threats
            for (const threat of threats) {
                const distToThreat = waypoint.distanceTo(threat.position);
                if (distToThreat < 16) {
                    // Move waypoint away from threat
                    const awayX = waypoint.x - threat.position.x;
                    const awayZ = waypoint.z - threat.position.z;
                    const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
                    
                    waypoint = waypoint.offset(
                        (awayX / length) * 10,
                        0,
                        (awayZ / length) * 10
                    );
                }
            }
            
            waypoints.push(waypoint);
        }
        
        waypoints.push(destination);
        return waypoints;
    }
    
    /**
     * Record threat encounter for learning
     */
    recordThreatEncounter(threat, outcome) {
        this.threatHistory.push({
            type: threat.type,
            position: threat.position.clone(),
            outcome: outcome, // 'defeated', 'retreated', 'died'
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.threatHistory.length > this.MAX_THREAT_HISTORY) {
            this.threatHistory.shift();
        }
        
        // Mark danger zone
        this.markDangerZone(threat.position);
    }
    
    /**
     * Mark area as danger zone
     */
    markDangerZone(position) {
        const chunkKey = this.getChunkKey(position);
        const existing = this.dangerZones.get(chunkKey) || { count: 0, lastSeen: 0 };
        
        this.dangerZones.set(chunkKey, {
            count: existing.count + 1,
            lastSeen: Date.now()
        });
    }
    
    /**
     * Check if area is a known danger zone
     */
    isDangerZone(position) {
        const chunkKey = this.getChunkKey(position);
        const zone = this.dangerZones.get(chunkKey);
        
        if (!zone) return false;
        
        // Zone expires after 10 minutes
        const EXPIRY = 600000;
        if (Date.now() - zone.lastSeen > EXPIRY) {
            this.dangerZones.delete(chunkKey);
            return false;
        }
        
        return zone.count >= 3; // 3+ encounters = danger zone
    }
    
    /**
     * Get chunk key for position
     */
    getChunkKey(position) {
        const chunkX = Math.floor(position.x / 16);
        const chunkZ = Math.floor(position.z / 16);
        return `${chunkX},${chunkZ}`;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalEncounters: this.threatHistory.length,
            dangerZones: this.dangerZones.size,
            currentThreats: this.scanForThreats().length
        };
    }
}

module.exports = MobThreatAI;

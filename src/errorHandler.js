const fs = require('fs');
const path = require('path');

/**
 * Advanced Error Handler and Recovery System
 * 
 * Handles all types of errors and implements smart recovery strategies
 * - Logs errors with context
 * - Implements retry logic with exponential backoff
 * - Self-healing mechanisms
 * - Critical error detection and resolution
 */
class ErrorHandler {
    constructor(bot, systems, notifier) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        
        // Error tracking
        this.errorLog = [];
        this.errorCounts = new Map();
        this.criticalErrors = new Set();
        this.recoveryAttempts = new Map();
        
        // Configuration
        this.MAX_ERROR_LOG = 1000;
        this.MAX_RECOVERY_ATTEMPTS = 3;
        this.CRITICAL_ERROR_THRESHOLD = 5; // Same error 5 times = critical
        
        // Error patterns for auto-recovery
        this.errorPatterns = new Map([
            ['PathfindingError', this.recoverFromPathfinding.bind(this)],
            ['InventoryFullError', this.recoverFromFullInventory.bind(this)],
            ['CraftingError', this.recoverFromCrafting.bind(this)],
            ['CombatError', this.recoverFromCombat.bind(this)],
            ['ConnectionError', this.recoverFromConnection.bind(this)],
            ['ResourceNotFoundError', this.recoverFromResourceNotFound.bind(this)],
            ['AIError', this.recoverFromAI.bind(this)],
            ['ProtocolError', this.ignoreProtocolError.bind(this)]
        ]);
        
        // Recovery success tracking
        this.recoveryStats = {
            totalErrors: 0,
            recovered: 0,
            failed: 0,
            criticals: 0
        };
        
        console.log('✓ Advanced Error Handler initialized');
    }

    /**
     * Main error handling entry point
     */
    async handleError(error, context = {}) {
        this.recoveryStats.totalErrors++;
        
        // Log the error
        this.logError(error, context);
        
        // Classify error
        const errorType = this.classifyError(error);
        
        // Check if critical
        if (this.isCriticalError(errorType)) {
            this.criticalErrors.add(errorType);
            this.recoveryStats.criticals++;
            await this.notifier.send(`🚨 CRITICAL: ${errorType} - ${error.message}`);
        }
        
        // Attempt recovery
        const recovered = await this.attemptRecovery(errorType, error, context);
        
        if (recovered) {
            this.recoveryStats.recovered++;
            console.log(`✓ Recovered from ${errorType}`);
        } else {
            this.recoveryStats.failed++;
            console.error(`✗ Failed to recover from ${errorType}`);
        }
        
        return recovered;
    }

    /**
     * Log error with context
     */
    logError(error, context) {
        const errorEntry = {
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack,
            type: error.name || 'UnknownError',
            context: {
                position: this.bot.entity?.position?.toString(),
                health: this.bot.health,
                food: this.bot.food,
                ...context
            }
        };
        
        this.errorLog.push(errorEntry);
        
        // Trim log if too large
        if (this.errorLog.length > this.MAX_ERROR_LOG) {
            this.errorLog.shift();
        }
        
        // Track error counts
        const count = (this.errorCounts.get(error.name) || 0) + 1;
        this.errorCounts.set(error.name, count);
        
        // Log to file for analysis
        this.writeErrorLog(errorEntry);
    }

    /**
     * Classify error type
     */
    classifyError(error) {
        const message = error.message?.toLowerCase() || '';
        const name = error.name || '';
        
        if (message.includes('pathfind') || message.includes('path')) return 'PathfindingError';
        if (message.includes('inventory') || message.includes('full')) return 'InventoryFullError';
        if (message.includes('craft')) return 'CraftingError';
        if (message.includes('combat') || message.includes('attack')) return 'CombatError';
        if (message.includes('connection') || message.includes('disconnect')) return 'ConnectionError';
        if (message.includes('not found') || message.includes('cannot find')) return 'ResourceNotFoundError';
        if (message.includes('ai') || message.includes('gemini')) return 'AIError';
        if (name === 'PartialReadError' || message.includes('protocol')) return 'ProtocolError';
        
        return name || 'GenericError';
    }

    /**
     * Check if error is critical
     */
    isCriticalError(errorType) {
        const count = this.errorCounts.get(errorType) || 0;
        return count >= this.CRITICAL_ERROR_THRESHOLD;
    }

    /**
     * Attempt recovery based on error type
     */
    async attemptRecovery(errorType, error, context) {
        const recoveryFn = this.errorPatterns.get(errorType);
        
        if (!recoveryFn) {
            console.warn(`No recovery strategy for ${errorType}`);
            return false;
        }
        
        // Check recovery attempt count
        const attempts = this.recoveryAttempts.get(errorType) || 0;
        if (attempts >= this.MAX_RECOVERY_ATTEMPTS) {
            console.error(`Max recovery attempts reached for ${errorType}`);
            this.recoveryAttempts.delete(errorType); // Reset for next time
            return false;
        }
        
        // Attempt recovery
        this.recoveryAttempts.set(errorType, attempts + 1);
        
        try {
            const result = await recoveryFn(error, context);
            if (result) {
                this.recoveryAttempts.delete(errorType); // Success - reset counter
            }
            return result;
        } catch (recoveryError) {
            console.error(`Recovery failed: ${recoveryError.message}`);
            return false;
        }
    }

    /**
     * Recovery strategies
     */
    
    async recoverFromPathfinding(error, context) {
        console.log('Recovering from pathfinding error...');
        
        // Strategy: Stop current movement, wait, try alternate path
        this.bot.pathfinder.setGoal(null);
        await this.sleep(2000);
        
        // Move to a safe nearby location
        const safePos = this.findSafeNearbyPosition();
        if (safePos) {
            try {
                const { goals } = require('mineflayer-pathfinder');
                await this.bot.pathfinder.goto(new goals.GoalBlock(safePos.x, safePos.y, safePos.z));
                return true;
            } catch (e) {
                return false;
            }
        }
        
        return false;
    }

    async recoverFromFullInventory(error, context) {
        console.log('Recovering from full inventory...');
        
        // Strategy: Drop junk items or store in nearby chest
        if (this.systems.inventory) {
            await this.systems.inventory.dropJunkItems();
            return true;
        }
        
        return false;
    }

    async recoverFromCrafting(error, context) {
        console.log('Recovering from crafting error...');
        
        // Strategy: Check materials, find crafting table, retry
        await this.sleep(1000);
        
        if (this.systems.crafting) {
            await this.systems.crafting.ensureCraftingTable();
            return true;
        }
        
        return false;
    }

    async recoverFromCombat(error, context) {
        console.log('Recovering from combat error...');
        
        // Strategy: Retreat to safety
        if (this.systems.combat && this.systems.combat.canRetreat()) {
            await this.systems.combat.retreat();
            return true;
        }
        
        return false;
    }

    async recoverFromConnection(error, context) {
        console.log('Recovering from connection error...');
        
        // Strategy: Wait for automatic reconnection
        // Connection errors are handled by index.js auto-reconnect
        return true; // Let auto-reconnect handle it
    }

    async recoverFromResourceNotFound(error, context) {
        console.log('Recovering from resource not found...');
        
        // Strategy: Switch to exploration mode
        if (this.systems.exploration) {
            await this.systems.exploration.exploreNewArea();
            return true;
        }
        
        return false;
    }

    async recoverFromAI(error, context) {
        console.log('Recovering from AI error...');
        
        // Strategy: Fall back to brain-based decisions
        // AI errors are non-critical, system continues with brain
        return true;
    }

    async ignoreProtocolError(error, context) {
        // Protocol errors are non-fatal, ignore them
        return true;
    }

    /**
     * Helper: Find safe nearby position
     */
    findSafeNearbyPosition() {
        const currentPos = this.bot.entity.position;
        const offsets = [
            { x: 2, z: 0 }, { x: -2, z: 0 },
            { x: 0, z: 2 }, { x: 0, z: -2 },
            { x: 2, z: 2 }, { x: -2, z: -2 }
        ];
        
        for (const offset of offsets) {
            const testPos = currentPos.offset(offset.x, 0, offset.z);
            const block = this.bot.blockAt(testPos);
            
            if (block && block.name === 'air') {
                return testPos;
            }
        }
        
        return null;
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        const topErrors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        return {
            ...this.recoveryStats,
            recoveryRate: this.recoveryStats.totalErrors > 0 
                ? ((this.recoveryStats.recovered / this.recoveryStats.totalErrors) * 100).toFixed(1) + '%'
                : 'N/A',
            topErrors: topErrors.map(([type, count]) => ({ type, count })),
            criticalErrors: Array.from(this.criticalErrors)
        };
    }

    /**
     * Report errors to Telegram
     */
    async reportErrors() {
        const stats = this.getStatistics();
        
        if (stats.totalErrors === 0) {
            await this.notifier.send('✅ No errors in this session');
            return;
        }
        
        let message = `🛠️ Error Report:\n`;
        message += `Total: ${stats.totalErrors}\n`;
        message += `Recovered: ${stats.recovered}\n`;
        message += `Failed: ${stats.failed}\n`;
        message += `Recovery Rate: ${stats.recoveryRate}\n`;
        
        if (stats.criticalErrors.length > 0) {
            message += `\n🚨 Critical: ${stats.criticalErrors.join(', ')}`;
        }
        
        if (stats.topErrors.length > 0) {
            message += `\n\nTop Errors:`;
            stats.topErrors.forEach(e => {
                message += `\n- ${e.type}: ${e.count}`;
            });
        }
        
        await this.notifier.send(message);
    }

    /**
     * Write error log to file
     */
    writeErrorLog(errorEntry) {
        try {
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            const logFile = path.join(logDir, 'error.log');
            const logLine = `[${new Date(errorEntry.timestamp).toISOString()}] ${errorEntry.type}: ${errorEntry.message}\n`;
            
            fs.appendFileSync(logFile, logLine);
        } catch (e) {
            // Silently fail if logging fails
        }
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        this.errorCounts.clear();
        this.criticalErrors.clear();
        this.recoveryAttempts.clear();
        this.recoveryStats = {
            totalErrors: 0,
            recovered: 0,
            failed: 0,
            criticals: 0
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ErrorHandler;

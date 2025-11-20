const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Persistent Storage System
 * SQLite abstraction layer for multi-session memory
 * Provides bot state persistence, exploration data, decision history, and performance metrics
 */
class StorageSystem {
    constructor(dbPath = './bot-data/bot-storage.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.memoryFallback = {
            botState: null,
            explorationData: [],
            decisionHistory: [],
            performanceMetrics: []
        };
        this.isInitialized = false;
        this.useMemoryOnly = false;
    }

    /**
     * Initialize database and create tables
     */
    async initialize() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath);
            
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            
            // Create tables
            this.createTables();
            
            // Clean up old data
            this.cleanupOldData();
            
            this.isInitialized = true;
            console.log('✓ Storage system initialized');
            return true;
        } catch (error) {
            console.warn('⚠ Storage initialization failed, using memory fallback:', error.message);
            this.useMemoryOnly = true;
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * Create database schema
     */
    createTables() {
        // Bot state table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS bot_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                position_x REAL NOT NULL,
                position_y REAL NOT NULL,
                position_z REAL NOT NULL,
                health REAL NOT NULL,
                food INTEGER NOT NULL,
                inventory TEXT,
                goals TEXT,
                current_goal TEXT,
                metadata TEXT
            )
        `);

        // Exploration data table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS exploration_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                chunk_x INTEGER NOT NULL,
                chunk_z INTEGER NOT NULL,
                biome TEXT,
                resources_found TEXT,
                structures TEXT,
                is_explored INTEGER DEFAULT 1,
                UNIQUE(chunk_x, chunk_z)
            )
        `);

        // Decision history table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS decision_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                decision_type TEXT NOT NULL,
                context TEXT,
                outcome TEXT,
                success INTEGER,
                confidence REAL,
                ai_source TEXT,
                execution_time INTEGER
            )
        `);

        // Performance metrics table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                metric_type TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metadata TEXT
            )
        `);

        // Create indexes for performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_bot_state_timestamp ON bot_state(timestamp);
            CREATE INDEX IF NOT EXISTS idx_exploration_chunk ON exploration_data(chunk_x, chunk_z);
            CREATE INDEX IF NOT EXISTS idx_decision_timestamp ON decision_history(timestamp);
            CREATE INDEX IF NOT EXISTS idx_decision_type ON decision_history(decision_type);
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp);
            CREATE INDEX IF NOT EXISTS idx_metrics_type ON performance_metrics(metric_type);
        `);
    }

    /**
     * Save current bot state
     */
    async saveState(state) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                this.memoryFallback.botState = { ...state, timestamp: Date.now() };
                return true;
            }

            const stmt = this.db.prepare(`
                INSERT INTO bot_state (
                    timestamp, position_x, position_y, position_z,
                    health, food, inventory, goals, current_goal, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                Date.now(),
                state.position.x,
                state.position.y,
                state.position.z,
                state.health,
                state.food,
                JSON.stringify(state.inventory || []),
                JSON.stringify(state.goals || []),
                state.currentGoal || null,
                JSON.stringify(state.metadata || {})
            );

            return true;
        } catch (error) {
            console.warn('⚠ Failed to save state:', error.message);
            // Fallback to memory
            this.memoryFallback.botState = { ...state, timestamp: Date.now() };
            return false;
        }
    }

    /**
     * Load latest bot state
     */
    async loadState() {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                return this.memoryFallback.botState;
            }

            const stmt = this.db.prepare(`
                SELECT * FROM bot_state 
                ORDER BY timestamp DESC 
                LIMIT 1
            `);

            const row = stmt.get();
            if (!row) return null;

            return {
                timestamp: row.timestamp,
                position: {
                    x: row.position_x,
                    y: row.position_y,
                    z: row.position_z
                },
                health: row.health,
                food: row.food,
                inventory: JSON.parse(row.inventory || '[]'),
                goals: JSON.parse(row.goals || '[]'),
                currentGoal: row.current_goal,
                metadata: JSON.parse(row.metadata || '{}')
            };
        } catch (error) {
            console.warn('⚠ Failed to load state:', error.message);
            return this.memoryFallback.botState;
        }
    }

    /**
     * Save exploration data
     */
    async saveExploration(chunkX, chunkZ, data) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                this.memoryFallback.explorationData.push({
                    chunkX, chunkZ, ...data, timestamp: Date.now()
                });
                return true;
            }

            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO exploration_data (
                    timestamp, chunk_x, chunk_z, biome, 
                    resources_found, structures, is_explored
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                Date.now(),
                chunkX,
                chunkZ,
                data.biome || null,
                JSON.stringify(data.resources || []),
                JSON.stringify(data.structures || []),
                data.isExplored ? 1 : 0
            );

            return true;
        } catch (error) {
            console.warn('⚠ Failed to save exploration data:', error.message);
            this.memoryFallback.explorationData.push({
                chunkX, chunkZ, ...data, timestamp: Date.now()
            });
            return false;
        }
    }

    /**
     * Query exploration data
     */
    async queryExploration(chunkX, chunkZ) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                return this.memoryFallback.explorationData.find(
                    e => e.chunkX === chunkX && e.chunkZ === chunkZ
                );
            }

            const stmt = this.db.prepare(`
                SELECT * FROM exploration_data 
                WHERE chunk_x = ? AND chunk_z = ?
            `);

            const row = stmt.get(chunkX, chunkZ);
            if (!row) return null;

            return {
                chunkX: row.chunk_x,
                chunkZ: row.chunk_z,
                biome: row.biome,
                resources: JSON.parse(row.resources_found || '[]'),
                structures: JSON.parse(row.structures || '[]'),
                isExplored: row.is_explored === 1,
                timestamp: row.timestamp
            };
        } catch (error) {
            console.warn('⚠ Failed to query exploration:', error.message);
            return this.memoryFallback.explorationData.find(
                e => e.chunkX === chunkX && e.chunkZ === chunkZ
            );
        }
    }

    /**
     * Save decision to history
     */
    async saveDecision(decision) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                this.memoryFallback.decisionHistory.push({
                    ...decision, timestamp: Date.now()
                });
                return true;
            }

            const stmt = this.db.prepare(`
                INSERT INTO decision_history (
                    timestamp, decision_type, context, outcome,
                    success, confidence, ai_source, execution_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                Date.now(),
                decision.type,
                JSON.stringify(decision.context || {}),
                JSON.stringify(decision.outcome || {}),
                decision.success ? 1 : 0,
                decision.confidence || null,
                decision.aiSource || null,
                decision.executionTime || null
            );

            return true;
        } catch (error) {
            console.warn('⚠ Failed to save decision:', error.message);
            this.memoryFallback.decisionHistory.push({
                ...decision, timestamp: Date.now()
            });
            return false;
        }
    }

    /**
     * Query decision history
     */
    async queryHistory(filters = {}) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                let results = [...this.memoryFallback.decisionHistory];
                if (filters.type) {
                    results = results.filter(d => d.type === filters.type);
                }
                if (filters.limit) {
                    results = results.slice(-filters.limit);
                }
                return results;
            }

            let query = 'SELECT * FROM decision_history WHERE 1=1';
            const params = [];

            if (filters.type) {
                query += ' AND decision_type = ?';
                params.push(filters.type);
            }
            if (filters.since) {
                query += ' AND timestamp >= ?';
                params.push(filters.since);
            }

            query += ' ORDER BY timestamp DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const stmt = this.db.prepare(query);
            const rows = stmt.all(...params);

            return rows.map(row => ({
                id: row.id,
                timestamp: row.timestamp,
                type: row.decision_type,
                context: JSON.parse(row.context || '{}'),
                outcome: JSON.parse(row.outcome || '{}'),
                success: row.success === 1,
                confidence: row.confidence,
                aiSource: row.ai_source,
                executionTime: row.execution_time
            }));
        } catch (error) {
            console.warn('⚠ Failed to query history:', error.message);
            return this.memoryFallback.decisionHistory.slice(-100);
        }
    }

    /**
     * Save performance metric
     */
    async saveMetric(type, value, metadata = {}) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                this.memoryFallback.performanceMetrics.push({
                    type, value, metadata, timestamp: Date.now()
                });
                return true;
            }

            const stmt = this.db.prepare(`
                INSERT INTO performance_metrics (
                    timestamp, metric_type, metric_value, metadata
                ) VALUES (?, ?, ?, ?)
            `);

            stmt.run(
                Date.now(),
                type,
                value,
                JSON.stringify(metadata)
            );

            return true;
        } catch (error) {
            console.warn('⚠ Failed to save metric:', error.message);
            this.memoryFallback.performanceMetrics.push({
                type, value, metadata, timestamp: Date.now()
            });
            return false;
        }
    }

    /**
     * Get metrics
     */
    async getMetrics(type, since = null) {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                let results = this.memoryFallback.performanceMetrics.filter(
                    m => m.type === type
                );
                if (since) {
                    results = results.filter(m => m.timestamp >= since);
                }
                return results;
            }

            let query = 'SELECT * FROM performance_metrics WHERE metric_type = ?';
            const params = [type];

            if (since) {
                query += ' AND timestamp >= ?';
                params.push(since);
            }

            query += ' ORDER BY timestamp ASC';

            const stmt = this.db.prepare(query);
            const rows = stmt.all(...params);

            return rows.map(row => ({
                timestamp: row.timestamp,
                type: row.metric_type,
                value: row.metric_value,
                metadata: JSON.parse(row.metadata || '{}')
            }));
        } catch (error) {
            console.warn('⚠ Failed to get metrics:', error.message);
            return this.memoryFallback.performanceMetrics.filter(
                m => m.type === type
            );
        }
    }

    /**
     * Get aggregate statistics
     */
    async getStats() {
        if (!this.isInitialized) await this.initialize();

        try {
            if (this.useMemoryOnly) {
                return {
                    totalStates: this.memoryFallback.botState ? 1 : 0,
                    chunksExplored: this.memoryFallback.explorationData.length,
                    totalDecisions: this.memoryFallback.decisionHistory.length,
                    totalMetrics: this.memoryFallback.performanceMetrics.length
                };
            }

            const states = this.db.prepare('SELECT COUNT(*) as count FROM bot_state').get();
            const chunks = this.db.prepare('SELECT COUNT(*) as count FROM exploration_data').get();
            const decisions = this.db.prepare('SELECT COUNT(*) as count FROM decision_history').get();
            const metrics = this.db.prepare('SELECT COUNT(*) as count FROM performance_metrics').get();

            return {
                totalStates: states.count,
                chunksExplored: chunks.count,
                totalDecisions: decisions.count,
                totalMetrics: metrics.count
            };
        } catch (error) {
            console.warn('⚠ Failed to get stats:', error.message);
            return {
                totalStates: 0,
                chunksExplored: 0,
                totalDecisions: 0,
                totalMetrics: 0
            };
        }
    }

    /**
     * Clean up data older than 30 days
     */
    cleanupOldData() {
        if (this.useMemoryOnly) return;

        try {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            // Keep only recent bot states (last 100)
            this.db.exec(`
                DELETE FROM bot_state 
                WHERE id NOT IN (
                    SELECT id FROM bot_state 
                    ORDER BY timestamp DESC 
                    LIMIT 100
                )
            `);

            // Delete old decision history
            this.db.prepare('DELETE FROM decision_history WHERE timestamp < ?').run(thirtyDaysAgo);

            // Delete old performance metrics
            this.db.prepare('DELETE FROM performance_metrics WHERE timestamp < ?').run(thirtyDaysAgo);

            console.log('✓ Cleaned up old data (>30 days)');
        } catch (error) {
            console.warn('⚠ Failed to clean up old data:', error.message);
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db && !this.useMemoryOnly) {
            this.db.close();
            console.log('✓ Storage system closed');
        }
    }
}

module.exports = StorageSystem;

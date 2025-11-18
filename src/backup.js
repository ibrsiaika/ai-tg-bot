const fs = require('fs');
const path = require('path');
const CONSTANTS = require('./constants');
const Utils = require('./utils');

/**
 * Backup System for Bot Memory and State
 * Periodically saves bot state and memory to prevent data loss
 */
class BackupSystem {
    constructor(bot, systems, notifier) {
        this.bot = bot;
        this.systems = systems;
        this.notifier = notifier;
        
        this.backupDir = path.join(__dirname, '../backups');
        this.memoryFile = path.join(__dirname, '..', CONSTANTS.MEMORY_FILE);
        
        this.backupInterval = 600000; // Backup every 10 minutes
        this.maxBackups = 10; // Keep only the last 10 backups
        
        this.backupTimer = null;
        
        this.ensureBackupDirectory();
        console.log('Backup System initialized');
    }

    /**
     * Ensure backup directory exists
     */
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('Created backup directory');
        }
    }

    /**
     * Start automatic backups
     */
    startAutomaticBackups() {
        console.log(`Starting automatic backups (every ${Utils.formatDuration(this.backupInterval)})`);
        
        this.backupTimer = setInterval(async () => {
            await this.createBackup();
        }, this.backupInterval);
    }

    /**
     * Stop automatic backups
     */
    stopAutomaticBackups() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
            console.log('Stopped automatic backups');
        }
    }

    /**
     * Create a backup of current bot state
     */
    async createBackup() {
        console.log('Creating backup...');
        
        try {
            const timestamp = Date.now();
            const backupData = this.gatherBackupData();
            
            // Create backup filename with timestamp
            const filename = `bot-backup-${timestamp}.json`;
            const filepath = path.join(this.backupDir, filename);
            
            // Write backup file
            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
            
            console.log(`Backup created: ${filename}`);
            
            // Clean up old backups
            this.cleanupOldBackups();
            
            return true;
        } catch (error) {
            console.error('Error creating backup:', error.message);
            return false;
        }
    }

    /**
     * Gather all data to backup
     */
    gatherBackupData() {
        const data = {
            timestamp: Date.now(),
            version: '1.0.0',
            bot: {
                position: {
                    x: this.bot.entity.position.x,
                    y: this.bot.entity.position.y,
                    z: this.bot.entity.position.z
                },
                health: this.bot.health,
                food: this.bot.food,
                experience: this.bot.experience
            },
            inventory: this.bot.inventory.items().map(item => ({
                name: item.name,
                count: item.count,
                slot: item.slot
            })),
            exploration: {},
            intelligence: {}
        };
        
        // Backup exploration data if available
        if (this.systems.exploration) {
            data.exploration = {
                homeBase: this.systems.exploration.homeBase ? {
                    x: this.systems.exploration.homeBase.x,
                    y: this.systems.exploration.homeBase.y,
                    z: this.systems.exploration.homeBase.z
                } : null,
                waypoints: this.systems.exploration.waypoints,
                deathCount: this.systems.exploration.deathCount,
                lastDeathPosition: this.systems.exploration.lastDeathPosition ? {
                    x: this.systems.exploration.lastDeathPosition.x,
                    y: this.systems.exploration.lastDeathPosition.y,
                    z: this.systems.exploration.lastDeathPosition.z
                } : null
            };
        }
        
        // Backup intelligence data if available
        if (this.systems.intelligence) {
            data.intelligence = {
                stats: this.systems.intelligence.getStats(),
                longTermGoals: this.systems.intelligence.longTermGoals,
                achievedMilestones: this.systems.intelligence.achievedMilestones
            };
        }
        
        // Backup behavior metrics if available
        if (this.systems.behavior) {
            data.performance = this.systems.behavior.performanceMetrics;
            data.adaptiveBehavior = this.systems.behavior.adaptiveBehavior;
        }
        
        return data;
    }

    /**
     * Clean up old backups, keeping only the most recent ones
     */
    cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('bot-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);
            
            // Remove old backups beyond maxBackups limit
            if (files.length > this.maxBackups) {
                const filesToDelete = files.slice(this.maxBackups);
                for (const file of filesToDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`Deleted old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up old backups:', error.message);
        }
    }

    /**
     * Restore from latest backup
     */
    async restoreFromLatestBackup() {
        console.log('Attempting to restore from latest backup...');
        
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('bot-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);
            
            if (files.length === 0) {
                console.log('No backups available to restore');
                return null;
            }
            
            const latestBackup = files[0];
            const backupData = JSON.parse(fs.readFileSync(latestBackup.path, 'utf8'));
            
            console.log(`Restored from backup: ${latestBackup.name}`);
            await this.notifier.send(`📦 Restored from backup (${new Date(backupData.timestamp).toLocaleString()})`);
            
            return backupData;
        } catch (error) {
            console.error('Error restoring from backup:', error.message);
            return null;
        }
    }

    /**
     * List all available backups
     */
    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('bot-backup-') && file.endsWith('.json'))
                .map(file => {
                    const filepath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filepath);
                    return {
                        name: file,
                        path: filepath,
                        time: stats.mtime.getTime(),
                        size: stats.size
                    };
                })
                .sort((a, b) => b.time - a.time);
            
            return files;
        } catch (error) {
            console.error('Error listing backups:', error.message);
            return [];
        }
    }

    /**
     * Get backup statistics
     */
    getStats() {
        const backups = this.listBackups();
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        
        return {
            count: backups.length,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            oldestBackup: backups.length > 0 ? backups[backups.length - 1].time : null,
            newestBackup: backups.length > 0 ? backups[0].time : null
        };
    }
}

module.exports = BackupSystem;

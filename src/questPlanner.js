/**
 * Multi-Goal Planning System
 * - Implements goal dependency system
 * - Creates long-term quest chains
 * - Tracks progress and percentages
 * - Adapts strategy if stuck
 */
class MultiGoalPlanner {
    constructor(bot, notifier, systems) {
        this.bot = bot;
        this.notifier = notifier;
        this.systems = systems;
        
        // Quest chains
        this.questChains = new Map(); // chainId -> quest chain
        this.activeChain = null;
        
        // Define progression quest chains
        this.QUEST_CHAINS = {
            early_game: {
                id: 'early_game',
                name: 'Early Game Survival',
                quests: [
                    { id: 1, name: 'Gather 64 wood', check: () => this.hasItems('log', 64), progress: 0 },
                    { id: 2, name: 'Build crafting table & furnace', check: () => this.hasItems('crafting_table', 1) && this.hasItems('furnace', 1), progress: 0 },
                    { id: 3, name: 'Gather 32 stone', check: () => this.hasItems('cobblestone', 32), progress: 0 },
                    { id: 4, name: 'Craft stone tools', check: () => this.hasItems('stone_pickaxe', 1), progress: 0 },
                    { id: 5, name: 'Build full base', check: () => this.systems.building?.baseBuilt, progress: 0 }
                ]
            },
            mid_game: {
                id: 'mid_game',
                name: 'Iron Age',
                quests: [
                    { id: 1, name: 'Mine 16 iron ore', check: () => this.hasItems('iron_ore', 16), progress: 0 },
                    { id: 2, name: 'Smelt iron ingots', check: () => this.hasItems('iron_ingot', 16), progress: 0 },
                    { id: 3, name: 'Craft iron tools', check: () => this.hasItems('iron_pickaxe', 1), progress: 0 },
                    { id: 4, name: 'Build farm', check: () => this.systems.farming?.farms?.length > 0, progress: 0 },
                    { id: 5, name: 'Reach full diamond tools', check: () => this.hasItems('diamond_pickaxe', 1), progress: 0 }
                ]
            },
            late_game: {
                id: 'late_game',
                name: 'Diamond & Beyond',
                quests: [
                    { id: 1, name: 'Find 3 diamonds', check: () => this.hasItems('diamond', 3), progress: 0 },
                    { id: 2, name: 'Craft diamond pickaxe', check: () => this.hasItems('diamond_pickaxe', 1), progress: 0 },
                    { id: 3, name: 'Mine at optimal Y-level', check: () => this.systems.mining?.miningDepth <= 16, progress: 0 },
                    { id: 4, name: 'Gather full diamond set', check: () => this.hasFullDiamondSet(), progress: 0 },
                    { id: 5, name: 'Build enchanting table', check: () => this.systems.enchanting?.enchantingTablePosition, progress: 0 }
                ]
            },
            nether_progression: {
                id: 'nether_progression',
                name: 'Nether Exploration',
                quests: [
                    { id: 1, name: 'Gather 10 obsidian', check: () => this.hasItems('obsidian', 10), progress: 0 },
                    { id: 2, name: 'Build Nether portal', check: () => this.hasBuiltNetherPortal(), progress: 0 },
                    { id: 3, name: 'Enter the Nether', check: () => this.systems.netherNavigation?.inNether, progress: 0 },
                    { id: 4, name: 'Find Nether fortress', check: () => this.systems.netherNavigation?.fortressLocations?.length > 0, progress: 0 },
                    { id: 5, name: 'Mine ancient debris', check: () => this.systems.netherNavigation?.ancientDebrisLocations?.length > 0, progress: 0 }
                ]
            }
        };
        
        // Progress tracking
        this.completedQuests = new Set();
        this.currentQuest = null;
        this.questAttempts = new Map(); // questId -> attempt count
        this.MAX_ATTEMPTS = 5;
        
        // Stuck detection
        this.lastProgressTime = Date.now();
        this.STUCK_THRESHOLD = 600000; // 10 minutes
    }
    
    /**
     * Check if inventory has items
     */
    hasItems(itemName, count) {
        const items = this.bot.inventory.items();
        const total = items
            .filter(item => item.name.includes(itemName))
            .reduce((sum, item) => sum + item.count, 0);
        return total >= count;
    }
    
    /**
     * Check for full diamond set
     */
    hasFullDiamondSet() {
        return this.hasItems('diamond_pickaxe', 1) &&
               this.hasItems('diamond_axe', 1) &&
               this.hasItems('diamond_sword', 1) &&
               this.hasItems('diamond_shovel', 1);
    }
    
    /**
     * Check if Nether portal is built
     */
    hasBuiltNetherPortal() {
        // Simplified check - would need to scan for portal frame
        return this.hasItems('obsidian', 10);
    }
    
    /**
     * Start a quest chain
     */
    startQuestChain(chainId) {
        const chain = this.QUEST_CHAINS[chainId];
        if (!chain) {
            console.log(`Quest chain ${chainId} not found`);
            return false;
        }
        
        console.log(`Starting quest chain: ${chain.name}`);
        this.activeChain = JSON.parse(JSON.stringify(chain)); // Deep copy
        this.currentQuest = this.activeChain.quests[0];
        
        this.notifier.send(`🎯 Quest Chain Started: ${chain.name}\nQuest 1: ${this.currentQuest.name}`);
        return true;
    }
    
    /**
     * Check quest progress
     */
    checkQuestProgress() {
        if (!this.currentQuest) {
            return null;
        }
        
        const completed = this.currentQuest.check();
        
        if (completed) {
            return this.completeCurrentQuest();
        }
        
        // Calculate progress percentage (if possible)
        const progress = this.estimateProgress(this.currentQuest);
        this.currentQuest.progress = progress;
        
        return {
            quest: this.currentQuest,
            completed: false,
            progress: progress
        };
    }
    
    /**
     * Estimate quest progress
     */
    estimateProgress(quest) {
        // Try to estimate progress based on quest type
        const name = quest.name.toLowerCase();
        
        // Gathering quests
        const gatherMatch = name.match(/gather (\d+) (\w+)/);
        if (gatherMatch) {
            const needed = parseInt(gatherMatch[1]);
            const item = gatherMatch[2];
            const items = this.bot.inventory.items();
            const current = items
                .filter(i => i.name.includes(item))
                .reduce((sum, i) => sum + i.count, 0);
            return Math.min(100, (current / needed) * 100);
        }
        
        // Mining quests
        const mineMatch = name.match(/mine (\d+) (\w+)/);
        if (mineMatch) {
            const needed = parseInt(mineMatch[1]);
            const item = mineMatch[2];
            const items = this.bot.inventory.items();
            const current = items
                .filter(i => i.name.includes(item))
                .reduce((sum, i) => sum + i.count, 0);
            return Math.min(100, (current / needed) * 100);
        }
        
        // Default: binary 0 or 100
        return quest.check() ? 100 : 0;
    }
    
    /**
     * Complete current quest and move to next
     */
    completeCurrentQuest() {
        console.log(`✓ Quest completed: ${this.currentQuest.name}`);
        this.completedQuests.add(this.currentQuest.id);
        this.lastProgressTime = Date.now();
        
        this.notifier.send(`✅ Quest Completed: ${this.currentQuest.name}`);
        
        // Find next quest
        const currentIndex = this.activeChain.quests.findIndex(q => q.id === this.currentQuest.id);
        
        if (currentIndex < this.activeChain.quests.length - 1) {
            this.currentQuest = this.activeChain.quests[currentIndex + 1];
            console.log(`Next quest: ${this.currentQuest.name}`);
            this.notifier.send(`🎯 Next Quest: ${this.currentQuest.name}`);
            
            return {
                quest: this.currentQuest,
                completed: true,
                chainComplete: false
            };
        } else {
            // Chain complete!
            console.log(`🎉 Quest chain completed: ${this.activeChain.name}`);
            this.notifier.send(`🎉 Quest Chain Complete: ${this.activeChain.name}`);
            
            this.activeChain = null;
            this.currentQuest = null;
            
            return {
                quest: null,
                completed: true,
                chainComplete: true
            };
        }
    }
    
    /**
     * Detect if stuck on a quest
     */
    isStuck() {
        if (!this.currentQuest) {
            return false;
        }
        
        const timeSinceProgress = Date.now() - this.lastProgressTime;
        
        if (timeSinceProgress > this.STUCK_THRESHOLD) {
            const questKey = `${this.activeChain.id}_${this.currentQuest.id}`;
            const attempts = this.questAttempts.get(questKey) || 0;
            
            if (attempts >= this.MAX_ATTEMPTS) {
                console.log(`Stuck on quest: ${this.currentQuest.name} (${attempts} attempts)`);
                return true;
            }
            
            this.questAttempts.set(questKey, attempts + 1);
            this.lastProgressTime = Date.now(); // Reset timer
        }
        
        return false;
    }
    
    /**
     * Adapt strategy when stuck
     */
    async adaptStrategy() {
        console.log('Adapting strategy due to being stuck');
        
        if (!this.currentQuest) {
            return;
        }
        
        const name = this.currentQuest.name.toLowerCase();
        
        // Suggest alternative approaches
        if (name.includes('gather wood')) {
            console.log('→ Try exploring different biomes for trees');
            await this.notifier.send('⚠️ Stuck on wood gathering. Exploring for trees...');
            // Could trigger exploration
        } else if (name.includes('mine') || name.includes('iron') || name.includes('diamond')) {
            console.log('→ Try mining at different Y-levels');
            await this.notifier.send('⚠️ Stuck on mining. Trying different depths...');
            // Could adjust mining strategy
        } else if (name.includes('build')) {
            console.log('→ Check for required materials');
            await this.notifier.send('⚠️ Stuck on building. Gathering materials...');
            // Could trigger resource gathering
        } else {
            console.log('→ Skipping quest and moving to next');
            await this.notifier.send('⚠️ Skipping stuck quest, moving to next');
            
            // Skip quest
            const currentIndex = this.activeChain.quests.findIndex(q => q.id === this.currentQuest.id);
            if (currentIndex < this.activeChain.quests.length - 1) {
                this.currentQuest = this.activeChain.quests[currentIndex + 1];
            }
        }
    }
    
    /**
     * Recommend next quest chain based on progression
     */
    recommendNextChain() {
        // Check inventory to determine game stage
        if (!this.hasItems('diamond', 1)) {
            if (!this.hasItems('iron_ingot', 8)) {
                if (!this.hasItems('stone_pickaxe', 1)) {
                    return 'early_game';
                }
                return 'mid_game';
            }
            return 'late_game';
        }
        
        // Check if ready for Nether
        if (this.hasItems('diamond_pickaxe', 1) && !this.hasItems('obsidian', 10)) {
            return 'nether_progression';
        }
        
        return null;
    }
    
    /**
     * Generate progress report
     */
    generateProgressReport() {
        let report = `\n=== Quest Progress Report ===\n`;
        
        if (!this.activeChain) {
            const recommended = this.recommendNextChain();
            report += `No active quest chain.\n`;
            if (recommended) {
                report += `Recommended: ${this.QUEST_CHAINS[recommended].name}\n`;
            }
            return report;
        }
        
        report += `Chain: ${this.activeChain.name}\n`;
        report += `Progress: ${this.completedQuests.size}/${this.activeChain.quests.length} quests\n\n`;
        
        for (const quest of this.activeChain.quests) {
            const status = this.completedQuests.has(quest.id) ? '✅' : 
                          quest.id === this.currentQuest?.id ? '🔄' : '⏳';
            
            let line = `${status} ${quest.id}. ${quest.name}`;
            
            if (quest.id === this.currentQuest?.id && quest.progress > 0) {
                line += ` (${quest.progress.toFixed(0)}%)`;
            }
            
            report += line + '\n';
        }
        
        if (this.isStuck()) {
            report += `\n⚠️ Stuck on current quest - adapting strategy\n`;
        }
        
        return report;
    }
    
    /**
     * Get goal dependency for a quest
     */
    getQuestDependencies(questId) {
        // Returns list of prerequisite quests
        const dependencies = [];
        
        if (!this.activeChain) {
            return dependencies;
        }
        
        const questIndex = this.activeChain.quests.findIndex(q => q.id === questId);
        
        // All previous quests are dependencies
        for (let i = 0; i < questIndex; i++) {
            dependencies.push(this.activeChain.quests[i]);
        }
        
        return dependencies;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            activeChain: this.activeChain?.id || null,
            currentQuest: this.currentQuest?.name || null,
            completedQuests: this.completedQuests.size,
            totalQuests: this.activeChain?.quests.length || 0,
            isStuck: this.isStuck()
        };
    }
}

module.exports = MultiGoalPlanner;

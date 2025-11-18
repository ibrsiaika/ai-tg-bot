/**
 * Intelligent Resource Prediction System
 * - Tracks current crafting goals and required materials
 * - Analyzes inventory to predict resource gaps
 * - Creates dependency chains (wood → sticks → tools → upgrades)
 * - Prioritizes gathering based on current goals
 * - Smart gathering sessions for multi-use resources
 */
class ResourcePredictor {
    constructor(bot, notifier, inventoryManager) {
        this.bot = bot;
        this.notifier = notifier;
        this.inventory = inventoryManager;
        
        // Current goals and their requirements
        this.craftingGoals = [];
        
        // Resource dependency chains
        this.DEPENDENCY_CHAINS = {
            // Basic tools chain
            'wooden_pickaxe': {
                requires: { 'planks': 3, 'stick': 2 },
                next: 'stone_pickaxe'
            },
            'wooden_axe': {
                requires: { 'planks': 3, 'stick': 2 },
                next: 'stone_axe'
            },
            'wooden_sword': {
                requires: { 'planks': 2, 'stick': 1 },
                next: 'stone_sword'
            },
            'wooden_shovel': {
                requires: { 'planks': 1, 'stick': 2 },
                next: 'stone_shovel'
            },
            
            // Stone tools chain
            'stone_pickaxe': {
                requires: { 'cobblestone': 3, 'stick': 2 },
                next: 'iron_pickaxe'
            },
            'stone_axe': {
                requires: { 'cobblestone': 3, 'stick': 2 },
                next: 'iron_axe'
            },
            'stone_sword': {
                requires: { 'cobblestone': 2, 'stick': 1 },
                next: 'iron_sword'
            },
            'stone_shovel': {
                requires: { 'cobblestone': 1, 'stick': 2 },
                next: 'iron_shovel'
            },
            
            // Iron tools chain
            'iron_pickaxe': {
                requires: { 'iron_ingot': 3, 'stick': 2 },
                next: 'diamond_pickaxe'
            },
            'iron_axe': {
                requires: { 'iron_ingot': 3, 'stick': 2 },
                next: 'diamond_axe'
            },
            'iron_sword': {
                requires: { 'iron_ingot': 2, 'stick': 1 },
                next: 'diamond_sword'
            },
            'iron_shovel': {
                requires: { 'iron_ingot': 1, 'stick': 2 },
                next: 'diamond_shovel'
            },
            
            // Diamond tools chain
            'diamond_pickaxe': {
                requires: { 'diamond': 3, 'stick': 2 },
                next: null
            },
            'diamond_axe': {
                requires: { 'diamond': 3, 'stick': 2 },
                next: null
            },
            'diamond_sword': {
                requires: { 'diamond': 2, 'stick': 1 },
                next: null
            },
            'diamond_shovel': {
                requires: { 'diamond': 1, 'stick': 2 },
                next: null
            },
            
            // Base materials
            'planks': {
                requires: { 'log': 0.25 }, // 1 log → 4 planks
                next: null
            },
            'stick': {
                requires: { 'planks': 0.5 }, // 2 planks → 4 sticks
                next: null
            },
            'crafting_table': {
                requires: { 'planks': 4 },
                next: null
            },
            'furnace': {
                requires: { 'cobblestone': 8 },
                next: null
            },
            'torch': {
                requires: { 'coal': 0.25, 'stick': 0.25 }, // 1 coal + 1 stick → 4 torches
                next: null
            },
            
            // Building materials
            'chest': {
                requires: { 'planks': 8 },
                next: null
            },
            'door': {
                requires: { 'planks': 6 },
                next: null
            },
            
            // Smelting
            'iron_ingot': {
                requires: { 'iron_ore': 1, 'coal': 0.125 }, // 1 ore needs fuel
                next: null
            },
            'gold_ingot': {
                requires: { 'gold_ore': 1, 'coal': 0.125 },
                next: null
            }
        };
        
        // Resource importance for different game stages
        this.RESOURCE_PRIORITIES = {
            early_game: {
                'log': 1.0,
                'cobblestone': 0.9,
                'coal': 0.8,
                'food': 0.95,
                'stick': 0.85
            },
            mid_game: {
                'iron_ore': 1.0,
                'iron_ingot': 0.95,
                'coal': 0.8,
                'food': 0.9,
                'diamond': 0.85
            },
            late_game: {
                'diamond': 1.0,
                'gold': 0.7,
                'redstone': 0.6,
                'obsidian': 0.8,
                'food': 0.85
            }
        };
        
        // Current game stage
        this.currentStage = 'early_game';
        
        // Smart gathering sessions
        this.gatheringSessions = [];
    }
    
    /**
     * Analyze inventory and predict resource gaps
     */
    analyzeResourceGaps() {
        const gaps = [];
        const inventory = this.getInventorySummary();
        
        // Determine game stage based on inventory
        this.updateGameStage(inventory);
        
        // Check critical resources for current stage
        const priorities = this.RESOURCE_PRIORITIES[this.currentStage];
        
        for (const [resource, priority] of Object.entries(priorities)) {
            const count = inventory[resource] || 0;
            const needed = this.getRecommendedAmount(resource);
            
            if (count < needed) {
                gaps.push({
                    resource: resource,
                    current: count,
                    needed: needed,
                    gap: needed - count,
                    priority: priority
                });
            }
        }
        
        // Sort by priority
        gaps.sort((a, b) => b.priority - a.priority);
        
        return gaps;
    }
    
    /**
     * Update game stage based on inventory
     */
    updateGameStage(inventory) {
        if (inventory.diamond >= 3) {
            this.currentStage = 'late_game';
        } else if (inventory.iron_ingot >= 8 || inventory.iron_ore >= 8) {
            this.currentStage = 'mid_game';
        } else {
            this.currentStage = 'early_game';
        }
    }
    
    /**
     * Get recommended amount for a resource
     */
    getRecommendedAmount(resource) {
        const recommendations = {
            'log': 64,
            'planks': 128,
            'stick': 32,
            'cobblestone': 256,
            'coal': 64,
            'iron_ore': 32,
            'iron_ingot': 24,
            'diamond': 6,
            'gold': 16,
            'food': 32
        };
        
        return recommendations[resource] || 16;
    }
    
    /**
     * Get inventory summary with item counts
     */
    getInventorySummary() {
        const summary = {};
        const items = this.bot.inventory.items();
        
        for (const item of items) {
            const name = item.name;
            summary[name] = (summary[name] || 0) + item.count;
        }
        
        return summary;
    }
    
    /**
     * Calculate what's needed for a crafting goal
     */
    calculateRequirements(goalItem, quantity = 1) {
        const requirements = {};
        
        const chain = this.DEPENDENCY_CHAINS[goalItem];
        if (!chain) {
            return { [goalItem]: quantity };
        }
        
        // Calculate direct requirements
        for (const [material, amount] of Object.entries(chain.requires)) {
            const totalNeeded = amount * quantity;
            requirements[material] = (requirements[material] || 0) + totalNeeded;
            
            // Recursively calculate sub-requirements
            const subReqs = this.calculateRequirements(material, totalNeeded);
            for (const [subMaterial, subAmount] of Object.entries(subReqs)) {
                if (subMaterial !== material) {
                    requirements[subMaterial] = (requirements[subMaterial] || 0) + subAmount;
                }
            }
        }
        
        return requirements;
    }
    
    /**
     * Add a crafting goal
     */
    addCraftingGoal(item, quantity = 1, priority = 0.5) {
        const requirements = this.calculateRequirements(item, quantity);
        
        this.craftingGoals.push({
            item: item,
            quantity: quantity,
            priority: priority,
            requirements: requirements,
            timestamp: Date.now()
        });
        
        console.log(`Crafting goal added: ${quantity}x ${item}`);
        console.log('Requirements:', requirements);
    }
    
    /**
     * Get next recommended gathering target
     */
    getNextGatheringTarget() {
        const gaps = this.analyzeResourceGaps();
        
        if (gaps.length === 0) {
            return null;
        }
        
        // Also consider crafting goals
        if (this.craftingGoals.length > 0) {
            const goal = this.craftingGoals[0];
            const inventory = this.getInventorySummary();
            
            // Find missing requirements
            for (const [material, needed] of Object.entries(goal.requirements)) {
                const current = inventory[material] || 0;
                if (current < needed) {
                    return {
                        resource: material,
                        reason: `Needed for ${goal.item}`,
                        needed: needed,
                        current: current,
                        priority: goal.priority
                    };
                }
            }
        }
        
        // Return highest priority gap
        return {
            resource: gaps[0].resource,
            reason: 'Resource gap',
            needed: gaps[0].needed,
            current: gaps[0].current,
            priority: gaps[0].priority
        };
    }
    
    /**
     * Create smart gathering session
     * Gathers multiple related resources in one trip
     */
    planSmartGatheringSession() {
        const gaps = this.analyzeResourceGaps();
        const session = {
            resources: [],
            estimatedTime: 0,
            priority: 0
        };
        
        // Group resources by gathering method
        const woodResources = gaps.filter(g => 
            g.resource.includes('log') || g.resource === 'stick' || g.resource === 'planks'
        );
        const stoneResources = gaps.filter(g => 
            g.resource.includes('stone') || g.resource === 'cobblestone'
        );
        const oreResources = gaps.filter(g => 
            g.resource.includes('ore') || g.resource.includes('coal')
        );
        
        // Plan session based on highest priority category
        if (woodResources.length > 0) {
            session.resources = woodResources;
            session.type = 'wood_gathering';
            session.estimatedTime = 300; // 5 minutes
        } else if (stoneResources.length > 0) {
            session.resources = stoneResources;
            session.type = 'stone_mining';
            session.estimatedTime = 300;
        } else if (oreResources.length > 0) {
            session.resources = oreResources;
            session.type = 'ore_mining';
            session.estimatedTime = 600; // 10 minutes
        }
        
        if (session.resources.length > 0) {
            session.priority = Math.max(...session.resources.map(r => r.priority));
        }
        
        return session;
    }
    
    /**
     * Get tool upgrade path
     */
    getToolUpgradePath(toolType) {
        // toolType: 'pickaxe', 'axe', 'sword', 'shovel'
        const inventory = this.getInventorySummary();
        const path = [];
        
        // Check what level we're at
        const levels = ['wooden', 'stone', 'iron', 'diamond'];
        let currentLevel = -1;
        
        for (let i = levels.length - 1; i >= 0; i--) {
            const toolName = `${levels[i]}_${toolType}`;
            if (inventory[toolName] && inventory[toolName] > 0) {
                currentLevel = i;
                break;
            }
        }
        
        // Determine next upgrade
        if (currentLevel < levels.length - 1) {
            const nextLevel = levels[currentLevel + 1];
            const nextTool = `${nextLevel}_${toolType}`;
            const requirements = this.calculateRequirements(nextTool, 1);
            
            path.push({
                tool: nextTool,
                requirements: requirements,
                canCraft: this.canCraftItem(nextTool)
            });
        }
        
        return path;
    }
    
    /**
     * Check if we can craft an item
     */
    canCraftItem(item) {
        const requirements = this.calculateRequirements(item, 1);
        const inventory = this.getInventorySummary();
        
        for (const [material, needed] of Object.entries(requirements)) {
            const current = inventory[material] || 0;
            if (current < needed) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get resource gathering efficiency score
     */
    getGatheringEfficiency() {
        const gaps = this.analyzeResourceGaps();
        
        if (gaps.length === 0) {
            return 1.0; // Perfect - no gaps
        }
        
        // Calculate efficiency based on gap severity
        const totalGapScore = gaps.reduce((sum, gap) => {
            return sum + (gap.gap / gap.needed) * gap.priority;
        }, 0);
        
        const efficiency = Math.max(0, 1 - (totalGapScore / gaps.length));
        return efficiency;
    }
    
    /**
     * Generate resource prediction report
     */
    generateReport() {
        const gaps = this.analyzeResourceGaps();
        const efficiency = this.getGatheringEfficiency();
        const nextTarget = this.getNextGatheringTarget();
        
        let report = `\n=== Resource Prediction Report ===\n`;
        report += `Game Stage: ${this.currentStage}\n`;
        report += `Efficiency: ${(efficiency * 100).toFixed(1)}%\n`;
        report += `Resource Gaps: ${gaps.length}\n\n`;
        
        if (nextTarget) {
            report += `Next Target: ${nextTarget.resource}\n`;
            report += `Reason: ${nextTarget.reason}\n`;
            report += `Current: ${nextTarget.current}, Need: ${Math.ceil(nextTarget.needed)}\n\n`;
        }
        
        if (gaps.length > 0) {
            report += `Top Resource Gaps:\n`;
            for (let i = 0; i < Math.min(5, gaps.length); i++) {
                const gap = gaps[i];
                report += `  ${i + 1}. ${gap.resource}: ${gap.current}/${gap.needed} (priority: ${gap.priority.toFixed(2)})\n`;
            }
        }
        
        if (this.craftingGoals.length > 0) {
            report += `\nCrafting Goals: ${this.craftingGoals.length}\n`;
            for (const goal of this.craftingGoals.slice(0, 3)) {
                report += `  - ${goal.quantity}x ${goal.item}\n`;
            }
        }
        
        return report;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            gameStage: this.currentStage,
            resourceGaps: this.analyzeResourceGaps().length,
            craftingGoals: this.craftingGoals.length,
            efficiency: this.getGatheringEfficiency()
        };
    }
}

module.exports = ResourcePredictor;

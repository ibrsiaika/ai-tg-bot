/**
 * Tool Durability Manager
 * Tracks tool wear and automatically replaces or crafts new tools
 */
class ToolDurabilityManager {
    constructor(bot, inventoryManager, craftingSystem, notifier) {
        this.bot = bot;
        this.inventory = inventoryManager;
        this.crafting = craftingSystem;
        this.notifier = notifier;
        
        // Tool durability thresholds
        this.replaceThreshold = 0.2; // Replace when below 20% durability
        this.warnThreshold = 0.3; // Warn when below 30%
        
        // Tool priorities
        this.toolPriority = {
            pickaxe: 1.0,
            axe: 0.9,
            shovel: 0.7,
            sword: 0.8,
            hoe: 0.5
        };
        
        console.log('Tool Durability Manager initialized');
    }

    /**
     * Check durability of currently equipped tool with enhanced visual feedback
     */
    checkEquippedTool() {
        const heldItem = this.bot.heldItem;
        if (!heldItem) return null;
        
        // Check if item has durability
        if (heldItem.maxDurability === null) return null;
        
        const durabilityPercent = (heldItem.maxDurability - heldItem.durabilityUsed) / heldItem.maxDurability;
        const durabilityUsesLeft = heldItem.maxDurability - heldItem.durabilityUsed;
        
        // Color-coded status
        let status = this.getDurabilityStatus(durabilityPercent);
        
        return {
            item: heldItem,
            durabilityPercent: durabilityPercent,
            durabilityUsesLeft: durabilityUsesLeft,
            status: status,
            needsReplacement: durabilityPercent < this.replaceThreshold,
            needsWarning: durabilityPercent < this.warnThreshold
        };
    }
    
    /**
     * Get color-coded durability status with emoji
     */
    getDurabilityStatus(percent) {
        if (percent > 0.75) {
            return { emoji: '✅', color: 'green', text: 'Excellent' };
        } else if (percent > 0.5) {
            return { emoji: '🟢', color: 'green', text: 'Good' };
        } else if (percent > 0.3) {
            return { emoji: '🟡', color: 'yellow', text: 'Fair' };
        } else if (percent > 0.15) {
            return { emoji: '🟠', color: 'orange', text: 'Low' };
        } else {
            return { emoji: '🔴', color: 'red', text: 'Critical' };
        }
    }

    /**
     * Check all tools in inventory with enhanced reporting
     */
    checkAllTools() {
        const tools = this.bot.inventory.items().filter(item => 
            item.name.includes('pickaxe') ||
            item.name.includes('axe') ||
            item.name.includes('shovel') ||
            item.name.includes('sword') ||
            item.name.includes('hoe')
        );
        
        const report = [];
        
        for (const tool of tools) {
            if (tool.maxDurability === null) continue;
            
            const durabilityPercent = (tool.maxDurability - tool.durabilityUsed) / tool.maxDurability;
            const usesLeft = tool.maxDurability - tool.durabilityUsed;
            const status = this.getDurabilityStatus(durabilityPercent);
            
            report.push({
                name: tool.name,
                durabilityPercent: durabilityPercent,
                usesLeft: usesLeft,
                status: status,
                needsReplacement: durabilityPercent < this.replaceThreshold,
                needsWarning: durabilityPercent < this.warnThreshold
            });
        }
        
        return report;
    }
    
    /**
     * Display tool durability report with visual indicators
     */
    displayToolReport() {
        const report = this.checkAllTools();
        
        if (report.length === 0) {
            console.log('📦 No tools in inventory');
            return;
        }
        
        console.log('\n🔧 === Tool Durability Report ===');
        for (const tool of report) {
            const percentStr = (tool.durabilityPercent * 100).toFixed(1);
            console.log(`${tool.status.emoji} ${tool.name}: ${percentStr}% (${tool.usesLeft} uses left) - ${tool.status.text}`);
            
            if (tool.needsReplacement) {
                console.log(`   ⚠️  REPLACE SOON!`);
            }
        }
        console.log('================================\n');
    }

    /**
     * Get the best available tool of a type
     */
    getBestTool(toolType) {
        const tools = this.bot.inventory.items().filter(item => 
            item.name.includes(toolType)
        );
        
        if (tools.length === 0) return null;
        
        // Prioritize by material quality, then durability
        const materialOrder = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'golden'];
        
        tools.sort((a, b) => {
            // First by material
            const aMaterialIndex = materialOrder.findIndex(m => a.name.includes(m));
            const bMaterialIndex = materialOrder.findIndex(m => b.name.includes(m));
            
            if (aMaterialIndex !== bMaterialIndex) {
                return aMaterialIndex - bMaterialIndex;
            }
            
            // Then by durability
            const aDurability = a.maxDurability ? (a.maxDurability - a.durabilityUsed) / a.maxDurability : 1;
            const bDurability = b.maxDurability ? (b.maxDurability - b.durabilityUsed) / b.maxDurability : 1;
            
            return bDurability - aDurability;
        });
        
        return tools[0];
    }

    /**
     * Auto-replace a broken or low durability tool
     */
    async autoReplaceTool(toolType) {
        console.log(`Auto-replacing ${toolType}...`);
        
        // First, check if we have a backup tool
        const bestTool = this.getBestTool(toolType);
        
        if (bestTool) {
            await this.bot.equip(bestTool, 'hand');
            console.log(`Equipped backup ${bestTool.name}`);
            return true;
        }
        
        // If no backup, try to craft a new one
        console.log(`No backup ${toolType} found, attempting to craft...`);
        
        const crafted = await this.craftReplacementTool(toolType);
        
        if (crafted) {
            await this.notifier.send(`⚒️ Crafted replacement ${toolType}`);
            return true;
        } else {
            await this.notifier.send(`⚠️ Unable to replace ${toolType} - need materials!`);
            return false;
        }
    }

    /**
     * Craft a replacement tool
     */
    async craftReplacementTool(toolType) {
        // Material requirements and checks
        const materialRequirements = {
            pickaxe: 3,
            axe: 3,
            shovel: 1,
            sword: 2,
            hoe: 2
        };
        
        const required = materialRequirements[toolType] || 3;
        
        // Define material options in priority order
        const materials = [
            { name: 'diamond', item: 'diamond' },
            { name: 'iron', item: 'iron_ingot' },
            { name: 'stone', item: 'cobblestone' },
            // 'planks' matches any plank type via InventoryManager.hasItem() which uses includes()
            // This will match oak_planks, birch_planks, spruce_planks, etc.
            { name: 'wooden', item: 'planks' }
        ];
        
        // Find first available material
        let selectedMaterial = null;
        for (const mat of materials) {
            // hasItem uses includes(), so 'planks' will match oak_planks, birch_planks, etc.
            const has = await this.inventory.hasItem(mat.item, required);
            if (has) {
                selectedMaterial = mat.name;
                break;
            }
        }
        
        if (!selectedMaterial) {
            return false; // No materials available
        }
        
        try {
            // Construct the item name in Minecraft format (material_tooltype)
            let itemName = '';
            switch (toolType) {
                case 'pickaxe':
                    itemName = `${selectedMaterial}_pickaxe`;
                    break;
                case 'axe':
                    itemName = `${selectedMaterial}_axe`;
                    break;
                case 'shovel':
                    itemName = `${selectedMaterial}_shovel`;
                    break;
                case 'sword':
                    itemName = `${selectedMaterial}_sword`;
                    break;
                case 'hoe':
                    itemName = `${selectedMaterial}_hoe`;
                    break;
                default:
                    console.error(`Unknown tool type: ${toolType}`);
                    return false;
            }
            
            await this.crafting.craftItem(itemName);
            return true;
        } catch (error) {
            console.error(`Error crafting ${toolType}:`, error.message);
            return false;
        }
    }

    /**
     * Periodic maintenance check
     */
    async performMaintenance() {
        console.log('Performing tool maintenance check...');
        
        const toolReport = this.checkAllTools();
        const needsReplacement = toolReport.filter(t => t.needsReplacement);
        const needsWarning = toolReport.filter(t => t.needsWarning && !t.needsReplacement);
        
        // Replace critically low tools
        for (const tool of needsReplacement) {
            const toolType = this.extractToolType(tool.name);
            console.log(`${tool.name} at ${(tool.durabilityPercent * 100).toFixed(0)}% - replacing`);
            await this.autoReplaceTool(toolType);
        }
        
        // Warn about low tools
        if (needsWarning.length > 0) {
            const warningMsg = needsWarning.map(t => 
                `${t.name}: ${(t.durabilityPercent * 100).toFixed(0)}%`
            ).join(', ');
            console.log(`Tool durability warning: ${warningMsg}`);
        }
        
        return {
            replaced: needsReplacement.length,
            warnings: needsWarning.length
        };
    }

    /**
     * Extract tool type from item name
     */
    extractToolType(itemName) {
        if (itemName.includes('pickaxe')) return 'pickaxe';
        if (itemName.includes('axe')) return 'axe';
        if (itemName.includes('shovel')) return 'shovel';
        if (itemName.includes('sword')) return 'sword';
        if (itemName.includes('hoe')) return 'hoe';
        return null;
    }

    /**
     * Get maintenance priority (0-1)
     */
    getMaintenancePriority() {
        const toolReport = this.checkAllTools();
        
        if (toolReport.length === 0) return 1.0; // No tools = high priority
        
        let totalPriority = 0;
        let count = 0;
        
        for (const tool of toolReport) {
            const toolType = this.extractToolType(tool.name);
            const priority = this.toolPriority[toolType] || 0.5;
            
            // Priority increases as durability decreases
            const urgency = 1.0 - tool.durabilityPercent;
            totalPriority += priority * urgency;
            count++;
        }
        
        return count > 0 ? totalPriority / count : 0;
    }
}

module.exports = ToolDurabilityManager;

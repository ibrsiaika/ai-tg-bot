const CONSTANTS = require('./constants');

/**
 * Role Configurations for Team Bots
 * 
 * Defines specialized behaviors and priorities for each bot role:
 * - Defender: Protects the base and team members
 * - Builder: Constructs and expands the base
 * - Miner: Gathers resources and returns to base
 */

const ROLE_CONFIGS = {
    /**
     * DEFENDER BOT - Protects the base from threats
     */
    defender: {
        name: 'Defender',
        primaryGoals: [
            'Patrol base perimeter',
            'Eliminate hostile mobs',
            'Protect team members',
            'Maintain defense structures',
            'Alert team of threats'
        ],
        priorities: {
            THREAT_RESPONSE: 100,
            TEAM_PROTECTION: 95,
            BASE_PATROL: 80,
            DEFENSE_MAINTENANCE: 70,
            SELF_PRESERVATION: 90
        },
        behaviorSettings: {
            combatRange: 16,
            patrolRadius: 30,
            alertDistance: 20,
            defendDistance: 50,
            retreatHealthThreshold: 30,
            equipBestWeapon: true,
            equipBestArmor: true,
            alwaysVigilant: true
        },
        equipment: {
            preferredWeapon: 'sword',
            preferredArmor: 'full_set',
            essentialItems: ['food', 'weapon', 'armor', 'shield']
        },
        tasks: {
            // High priority combat tasks
            combat: {
                priority: 100,
                enabled: true,
                aggressive: true
            },
            // Patrol the base
            patrol: {
                priority: 80,
                enabled: true,
                pattern: 'perimeter'
            },
            // Light up dark areas
            lighting: {
                priority: 60,
                enabled: true,
                torchInterval: 8
            },
            // Build defensive structures
            defense: {
                priority: 70,
                enabled: true,
                structures: ['wall', 'watchtower', 'gate']
            },
            // Minimal resource gathering
            gathering: {
                priority: 30,
                enabled: false
            },
            // No mining
            mining: {
                priority: 0,
                enabled: false
            },
            // No farming
            farming: {
                priority: 0,
                enabled: false
            }
        }
    },
    
    /**
     * BUILDER BOT - Constructs and expands the base
     */
    builder: {
        name: 'Builder',
        primaryGoals: [
            'Construct base structures',
            'Expand living quarters',
            'Build storage facilities',
            'Create farms',
            'Improve infrastructure'
        ],
        priorities: {
            BASE_CONSTRUCTION: 100,
            EXPANSION: 90,
            RESOURCE_MANAGEMENT: 85,
            INFRASTRUCTURE: 80,
            SELF_PRESERVATION: 70
        },
        behaviorSettings: {
            buildRange: 100,
            planningDistance: 50,
            materialStockpile: 128,
            retreatHealthThreshold: 40,
            equipBestTool: true,
            efficientBuilding: true,
            aestheticMode: false
        },
        equipment: {
            preferredTool: 'multi',
            preferredArmor: 'light',
            essentialItems: ['food', 'building_blocks', 'tools', 'torches']
        },
        tasks: {
            // Minimal combat
            combat: {
                priority: 40,
                enabled: true,
                aggressive: false
            },
            // No patrol
            patrol: {
                priority: 0,
                enabled: false
            },
            // High priority building
            building: {
                priority: 100,
                enabled: true,
                structures: ['walls', 'rooms', 'storage', 'farms', 'roads']
            },
            // Advanced base building
            advancedBase: {
                priority: 95,
                enabled: true,
                features: ['watchtowers', 'moat', 'lighting', 'organization']
            },
            // Moderate resource gathering
            gathering: {
                priority: 70,
                enabled: true,
                focus: ['wood', 'stone', 'dirt']
            },
            // Limited mining for materials
            mining: {
                priority: 60,
                enabled: true,
                materials: ['stone', 'coal']
            },
            // Farm construction and maintenance
            farming: {
                priority: 80,
                enabled: true,
                crops: ['wheat', 'carrots', 'potatoes']
            },
            // Crafting for construction
            crafting: {
                priority: 75,
                enabled: true,
                items: ['blocks', 'tools', 'torches', 'doors']
            }
        }
    },
    
    /**
     * MINER BOT - Gathers resources and returns to base
     */
    miner: {
        name: 'Miner',
        primaryGoals: [
            'Mine valuable ores',
            'Gather underground resources',
            'Return materials to base',
            'Explore cave systems',
            'Maintain mining operations'
        ],
        priorities: {
            MINING_OPERATIONS: 100,
            RESOURCE_DELIVERY: 95,
            EXPLORATION: 85,
            TOOL_MAINTENANCE: 90,
            SELF_PRESERVATION: 80
        },
        behaviorSettings: {
            miningDepth: 12,
            miningRadius: 200,
            inventoryReturnThreshold: 0.8,
            retreatHealthThreshold: 50,
            equipBestPickaxe: true,
            efficientMining: true,
            caveExploration: true
        },
        equipment: {
            preferredTool: 'pickaxe',
            preferredArmor: 'medium',
            essentialItems: ['food', 'pickaxe', 'torches', 'weapon']
        },
        tasks: {
            // Combat only for self-defense
            combat: {
                priority: 50,
                enabled: true,
                aggressive: false
            },
            // No patrol
            patrol: {
                priority: 0,
                enabled: false
            },
            // No building
            building: {
                priority: 20,
                enabled: false
            },
            // Primary task: Mining
            mining: {
                priority: 100,
                enabled: true,
                ores: ['coal', 'iron', 'gold', 'diamond', 'redstone', 'lapis'],
                depth: 12,
                branchMining: true
            },
            // Resource gathering on the way
            gathering: {
                priority: 60,
                enabled: true,
                opportunistic: true
            },
            // Active exploration
            exploration: {
                priority: 85,
                enabled: true,
                focus: 'underground'
            },
            // Tool crafting and upgrading
            crafting: {
                priority: 90,
                enabled: true,
                items: ['pickaxe', 'torches', 'sword']
            },
            // No farming
            farming: {
                priority: 0,
                enabled: false
            },
            // Regular base returns
            baseReturn: {
                priority: 95,
                enabled: true,
                interval: 600000 // Every 10 minutes
            }
        }
    }
};

/**
 * Get role configuration
 * @param {string} role - Role name
 * @returns {Object} Role configuration
 */
function getRoleConfig(role) {
    return ROLE_CONFIGS[role] || null;
}

/**
 * Check if a task is enabled for a role
 * @param {string} role - Role name
 * @param {string} task - Task name
 * @returns {boolean} True if enabled
 */
function isTaskEnabled(role, task) {
    const config = ROLE_CONFIGS[role];
    if (!config) return false;
    
    return config.tasks[task]?.enabled || false;
}

/**
 * Get task priority for a role
 * @param {string} role - Role name
 * @param {string} task - Task name
 * @returns {number} Priority value
 */
function getTaskPriority(role, task) {
    const config = ROLE_CONFIGS[role];
    if (!config) return 0;
    
    return config.tasks[task]?.priority || 0;
}

/**
 * Get role-specific behavior settings
 * @param {string} role - Role name
 * @returns {Object} Behavior settings
 */
function getBehaviorSettings(role) {
    const config = ROLE_CONFIGS[role];
    return config ? config.behaviorSettings : {};
}

module.exports = {
    ROLE_CONFIGS,
    getRoleConfig,
    isTaskEnabled,
    getTaskPriority,
    getBehaviorSettings
};

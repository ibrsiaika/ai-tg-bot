/**
 * Mock Mineflayer Bot Instance
 * Used for testing without running actual Minecraft server
 */

// Mock Vec3 class
class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    offset(dx, dy, dz) {
        return new Vec3(this.x + dx, this.y + dy, this.z + dz);
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    toString() {
        return `Vec3(${this.x}, ${this.y}, ${this.z})`;
    }
}

class MockBot {
    constructor() {
        this.username = 'TestBot';
        this.health = 20;
        this.food = 20;
        this.entity = {
            position: new Vec3(0, 64, 0),
            isInWater: false,
            isInLava: false,
            onFire: false
        };
        this.game = {
            gameMode: 'survival'
        };
        this.experience = {
            level: 0,
            points: 0
        };
        this.inventory = {
            items: () => [],
            slots: new Array(36).fill(null)
        };
        this.pathfinder = {
            setMovements: jest.fn(),
            goto: jest.fn().mockResolvedValue()
        };
        this.entities = {};
        this.players = {};
        this.oxygenLevel = 20;
        this._client = null;
        
        // Event emitter methods
        this.listeners = new Map();
    }

    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }

    once(event, handler) {
        this.on(event, handler);
    }

    emit(event, ...args) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(handler => handler(...args));
        }
    }

    loadPlugin(plugin) {
        // Mock plugin loading
    }

    blockAt(position) {
        return {
            name: 'stone',
            position,
            type: 1
        };
    }

    findBlock(options) {
        return null;
    }

    findBlocks(options) {
        return [];
    }

    quit() {
        // Mock quit
    }

    chat(message) {
        // Mock chat
    }

    equip(item, destination) {
        return Promise.resolve();
    }

    unequip(destination) {
        return Promise.resolve();
    }

    activateItem() {
        return Promise.resolve();
    }

    deactivateItem() {
        // Mock deactivate
    }

    tossStack(item) {
        return Promise.resolve();
    }

    attack(entity) {
        // Mock attack
    }

    lookAt(position) {
        return Promise.resolve();
    }

    setControlState(control, state) {
        // Mock control
    }
}

// Mock minecraft-data
const mockMcData = () => ({
    items: {},
    blocks: {},
    itemsByName: {},
    blocksByName: {}
});

// Mock pathfinder
const mockPathfinder = {
    pathfinder: {},
    Movements: class Movements {
        constructor(bot, mcData) {
            this.bot = bot;
            this.mcData = mcData;
        }
    },
    goals: {
        GoalNear: class GoalNear {
            constructor(x, y, z, range) {
                this.x = x;
                this.y = y;
                this.z = z;
                this.range = range;
            }
        },
        GoalBlock: class GoalBlock {
            constructor(x, y, z) {
                this.x = x;
                this.y = y;
                this.z = z;
            }
        },
        GoalFollow: class GoalFollow {
            constructor(entity, range) {
                this.entity = entity;
                this.range = range;
            }
        }
    }
};

// Mock collectblock plugin
const mockCollectBlock = {
    plugin: (bot) => {
        bot.collectBlock = {
            collect: jest.fn().mockResolvedValue()
        };
    }
};

module.exports = {
    MockBot,
    Vec3,
    mockMcData,
    mockPathfinder,
    mockCollectBlock,
    createMockBot: () => new MockBot()
};

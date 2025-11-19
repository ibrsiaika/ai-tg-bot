# Multi-Bot Team System Guide

## Overview

The Multi-Bot Team System is a major upgrade that enables **three specialized bots** to work together as a coordinated team. Each bot has a specific role and collaborates with others to achieve common goals.

## Team Members

### 🛡️ Defender Bot
**Primary Role:** Protect the base and team members

**Responsibilities:**
- Patrol the base perimeter (30-block radius)
- Detect and eliminate hostile mobs
- Alert team when threats are detected
- Maintain defensive structures
- Respond to help requests from other bots
- Keep the area well-lit to prevent mob spawns

**Behavior Settings:**
- Combat Range: 16 blocks
- Patrol Radius: 30 blocks
- Retreat at: <30% health
- Always equipped with best weapon and armor
- Aggressive combat stance

**Key Tasks:**
- ✅ Combat (Priority: 100)
- ✅ Base Patrol (Priority: 80)
- ✅ Lighting Maintenance (Priority: 60)
- ✅ Defense Structures (Priority: 70)
- ❌ Mining (Disabled)
- ❌ Farming (Disabled)

---

### 🏗️ Builder Bot
**Primary Role:** Construct and expand the base

**Responsibilities:**
- Build base structures (walls, rooms, storage)
- Construct farms and infrastructure
- Gather building materials (wood, stone)
- Organize storage facilities
- Improve and expand existing structures
- Create roads and pathways

**Behavior Settings:**
- Build Range: 100 blocks
- Material Stockpile: 128+ items
- Retreat at: <40% health
- Equipped with best tools
- Aesthetic building mode available

**Key Tasks:**
- ✅ Building (Priority: 100)
- ✅ Advanced Base (Priority: 95)
- ✅ Farming Setup (Priority: 80)
- ✅ Crafting (Priority: 75)
- ✅ Material Gathering (Priority: 70)
- ⚠️ Combat (Priority: 40, Defensive only)

---

### ⛏️ Miner Bot
**Primary Role:** Gather underground resources

**Responsibilities:**
- Mine valuable ores (diamonds, iron, gold, etc.)
- Explore cave systems
- Return materials to base regularly
- Maintain mining tools
- Deliver resources to shared storage
- Branch mining at optimal depths

**Behavior Settings:**
- Mining Depth: Y=12 (optimal for diamonds)
- Mining Radius: 200 blocks
- Return at: 80% inventory full
- Retreat at: <50% health
- Equipped with best pickaxe
- Cave exploration enabled

**Key Tasks:**
- ✅ Mining (Priority: 100)
- ✅ Base Return (Priority: 95)
- ✅ Tool Crafting (Priority: 90)
- ✅ Exploration (Priority: 85)
- ✅ Opportunistic Gathering (Priority: 60)
- ⚠️ Combat (Priority: 50, Self-defense only)

## Team Coordination Features

### 🤝 Inter-Bot Communication
Bots can send messages and requests to each other:

**Message Types:**
- `THREAT_DETECTED` - Alert team of danger
- `RESOURCES_DEPOSITED` - Notify when resources are stored
- `HELP_NEEDED` - Request assistance
- `RESOURCE_REQUEST` - Ask for specific materials
- `BASE_LOCATION_SET` - Share base coordinates
- `STORAGE_LOCATION_SET` - Share storage location

**Request System:**
```javascript
// Example: Builder requests resources from Miner
teamCoordinator.sendRequest('BuilderBot', 'miner', 'RESOURCE_REQUEST', {
    item: 'iron_ingot',
    quantity: 16
});
```

### 📦 Shared Resource Pool
All bots contribute to and can draw from a shared resource pool:

**Shared Resources:**
- Ores (diamond, iron, gold, coal, redstone)
- Building materials (stone, wood, planks)
- Food and supplies
- Crafted items

**Resource Management:**
```javascript
// Add resources to shared pool
teamCoordinator.addSharedResource('diamond', 3);

// Take resources from shared pool
const taken = teamCoordinator.takeSharedResource('iron_ingot', 10);
```

### 🆘 Team Help System
Bots automatically help each other when needed:

**Help Triggers:**
- Health below 30%
- Surrounded by multiple enemies
- Inventory full (for Miner)
- Under attack (for Defender)

**Help Response:**
- Checks if helper is available (health >50%)
- Verifies distance is within threshold (50 blocks)
- Navigates to location
- Provides assistance
- Reports completion

### 📊 Team Status Reporting
The team generates periodic status reports every 10 minutes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        TEAM STATUS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEFENDER: 🟢 ACTIVE
  Health: 18/20 | Alerts: 2
  Position: (125, 64, -43)

BUILDER: 🟢 ACTIVE
  Health: 20/20 | Progress: 45%
  Position: (130, 65, -38)

MINER: 🟢 ACTIVE
  Health: 16/20 | Inventory: 73%
  Position: (142, 12, -51)

SHARED RESOURCES:
  diamond: 5
  iron_ore: 32
  coal: 64

ACTIVE REQUESTS: 1
  #42: MinerBot -> builder [RESOURCE_REQUEST]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## AI Integration Enhancements

### 🤖 Console Logging
All AI prompts and responses are now logged to console:

**Sent Prompt Example:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI PROMPT SENT [Decision Request]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are an autonomous Minecraft bot AI. Make a decision...

Health: 18/20
Food: 15/20
Time: Day
Position: {"x": 125, "y": 64, "z": -43}
Nearby Threats: none
Inventory Status: Available
Current Tools: {"pickaxe": "iron", "sword": "iron"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Received Response Example:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ AI RESPONSE RECEIVED [Decision Response]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "action": "mine_stone",
  "priority": "high",
  "reasoning": "Inventory has space and tools are ready"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 🧠 Enhanced AI Decision Making
Each bot can consult Gemini AI for:
- Strategic decisions
- Crafting suggestions
- Building advice
- Danger responses
- Performance analysis

**AI Features:**
- Prompt/response logging for transparency
- Context-aware decision making
- Role-specific advice
- Performance optimization suggestions

## Getting Started

### 1. Installation
```bash
# Already installed if you have the bot
npm install
```

### 2. Configuration
Ensure your `.env` file is configured:
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AutoBot
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id
GEMINI_API_KEY=your_api_key_here  # Optional but recommended
```

### 3. Launch Team Mode
```bash
npm run team
```

This will start all three bots:
- DefenderBot
- BuilderBot
- MinerBot

### 4. Monitor Team Activity
Watch the console for:
- Team coordination messages
- AI prompt/response logs
- Status updates
- Team reports

Check Telegram for:
- Team status updates
- Important events
- Resource discoveries
- Coordination alerts

## Usage Examples

### Example 1: Base Protection
```
[defender] Bot spawned at base
[defender] Starting patrol around perimeter
[defender] Threat detected: 2 zombies at distance 14
[defender] TEAM BROADCAST: THREAT_DETECTED
[defender] Engaging targets...
[defender] Threats eliminated
[defender] Resuming patrol
```

### Example 2: Building Project
```
[builder] Starting new building project
[builder] Gathering building materials...
[builder] Wood gathered: 64 oak_logs
[builder] Crafting planks...
[builder] Building storage room...
[builder] Structure 45% complete
[builder] TEAM BROADCAST: RESOURCES_NEEDED (stone: 32)
[miner] Received request for stone
[miner] Navigating to deliver resources
```

### Example 3: Mining Operation
```
[miner] Descending to Y=12 for mining
[miner] Branch mine started at (150, 12, -60)
[miner] Found: coal_ore x5
[miner] Found: iron_ore x3
[miner] Found: DIAMOND_ORE x2!
[miner] Inventory 82% full - returning to base
[miner] Depositing to shared storage...
[miner] TEAM BROADCAST: RESOURCES_DEPOSITED (diamond: 2)
```

## Advanced Features

### Custom Role Configuration
Modify `src/roleConfigs.js` to customize bot behaviors:

```javascript
defender: {
    behaviorSettings: {
        combatRange: 16,      // Increase for larger patrol
        patrolRadius: 30,     // Adjust patrol area
        alertDistance: 20,    // Alert threshold
        // ... more settings
    }
}
```

### Team Coordination API
Use the TeamCoordinator programmatically:

```javascript
// Get team status
const status = teamCoordinator.getTeamStatus();

// Send team message
teamCoordinator.broadcastMessage('system', 'ALERT', { 
    message: 'Server restart in 5 minutes' 
});

// Request help
teamCoordinator.sendRequest('bot1', 'defender', 'HELP_NEEDED', {
    location: position,
    reason: 'under_attack'
});
```

### AI Logging Control
Toggle AI logging programmatically:

```javascript
// Disable logging (for performance)
geminiAI.setConsoleLogging(false);

// Re-enable logging
geminiAI.setConsoleLogging(true);
```

## Troubleshooting

### Problem: Bots not coordinating
**Solution:** Check that all bots have spawned and base location is set
```bash
# Look for in console:
✓ Base location set: (x, y, z)
```

### Problem: AI responses not showing
**Solution:** Verify Gemini API key is configured
```bash
npm run check-env
# Should show: Gemini AI: Configured
```

### Problem: Bots getting stuck
**Solution:** Ensure pathfinding is initialized for all bots
```bash
# Check console for:
✓ DefenderBot (defender) is now active
✓ BuilderBot (builder) is now active
✓ MinerBot (miner) is now active
```

### Problem: High resource usage
**Solution:** Adjust team size or increase delays between actions
- Reduce `behaviorLoop` frequency in `roleBehaviorManager.js`
- Disable AI logging: `geminiAI.setConsoleLogging(false)`

## Performance Tips

1. **Monitor Memory Usage**: Three bots use 3x resources
2. **Use AI Sparingly**: AI calls count against free tier limits
3. **Optimize Patrol Routes**: Reduce defender patrol radius
4. **Batch Resources**: Miner should return less frequently
5. **Limit Team Reports**: Increase reporting interval

## Future Enhancements

Potential improvements for the team system:
- [ ] Dynamic role assignment based on needs
- [ ] More than 3 bots (configurable team size)
- [ ] Advanced formation tactics
- [ ] Shared goal planning
- [ ] Team skill progression
- [ ] Cross-bot learning from experiences
- [ ] Voice coordination (if voice API available)

## Comparison: Single Bot vs Team

| Feature | Single Bot | Team Mode |
|---------|-----------|-----------|
| Efficiency | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Base Protection | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Building Speed | ⭐⭐ | ⭐⭐⭐⭐ |
| Resource Gathering | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Complexity | Low | Medium |
| Resource Usage | Low | High |
| Coordination | N/A | ⭐⭐⭐⭐ |
| Specialization | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## Credits

Built with:
- Mineflayer - Minecraft bot framework
- Google Gemini AI - AI decision making
- Node.js - Runtime environment

---

**Mode**: Multi-Bot Team | **Coordination**: Enabled | **AI Integration**: Enhanced | **Roles**: 3 Active

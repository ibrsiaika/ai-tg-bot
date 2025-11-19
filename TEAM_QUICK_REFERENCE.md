# Team System - Quick Reference

## Starting the Bots

### Team Mode (3 Bots)
```bash
npm run team
```
Starts:
- DefenderBot (protects base)
- BuilderBot (constructs structures)
- MinerBot (gathers resources)

### Single Bot Mode
```bash
npm start
```
Starts one autonomous bot (original mode)

## Role Summary

| Role | Primary Task | Combat | Building | Mining |
|------|-------------|--------|----------|--------|
| Defender | Protect base | ✅✅✅ | ⚠️ | ❌ |
| Builder | Build structures | ⚠️ | ✅✅✅ | ⚠️ |
| Miner | Gather resources | ⚠️ | ❌ | ✅✅✅ |

## Team Coordination

### Messages
```javascript
teamCoordinator.broadcastMessage(from, type, data);
```

**Types:**
- `THREAT_DETECTED` - Enemy spotted
- `RESOURCES_DEPOSITED` - Items stored
- `HELP_NEEDED` - Need assistance
- `BASE_LOCATION_SET` - Base coords shared

### Requests
```javascript
teamCoordinator.sendRequest(from, toRole, type, data);
```

**Types:**
- `HELP_NEEDED` - Request backup
- `RESOURCE_REQUEST` - Request items
- `DEFEND_LOCATION` - Protect area
- `BUILD_STRUCTURE` - Build something
- `MINE_RESOURCE` - Mine specific ore

### Shared Resources
```javascript
// Add to pool
teamCoordinator.addSharedResource(item, quantity);

// Take from pool
teamCoordinator.takeSharedResource(item, quantity);
```

## AI Logging

All AI interactions are logged to console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI PROMPT SENT [Decision Request]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[prompt content]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ AI RESPONSE RECEIVED [Decision Response]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[response content]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Control logging:
```javascript
geminiAI.setConsoleLogging(false); // Disable
geminiAI.setConsoleLogging(true);  // Enable
```

## Monitoring

### Console Messages
- `[defender]` - Defender activities
- `[builder]` - Builder activities
- `[miner]` - Miner activities
- `[TEAM]` - Coordination messages

### Status Reports
Generated every 10 minutes showing:
- Each bot's health
- Current position
- Role-specific metrics
- Shared resources
- Active requests

### Telegram Notifications
Sent for:
- Team startup
- Major events
- Status updates
- Threat alerts

## Common Tasks

### Customize Role Behavior
Edit `src/roleConfigs.js`:
```javascript
defender: {
    behaviorSettings: {
        combatRange: 16,     // Attack range
        patrolRadius: 30,    // Patrol area
        // ...
    }
}
```

### Adjust Team Size
Currently fixed at 3 bots. To change:
1. Edit `index-team.js`
2. Add/remove `createBot()` calls
3. Update role assignments

### Change Bot Names
In `index-team.js`:
```javascript
await this.createBot('defender', 'YourDefenderName');
await this.createBot('builder', 'YourBuilderName');
await this.createBot('miner', 'YourMinerName');
```

## Troubleshooting

### Bots not spawning
- Check server allows multiple connections
- Verify unique usernames
- Check whitelist settings

### No coordination
- Wait for base location to be set
- Check console for `[TEAM]` messages
- Verify all bots initialized

### High CPU/Memory
- Normal with 3 bots
- Each bot uses ~10% CPU, ~150MB RAM
- Total: ~30% CPU, ~450MB RAM

### AI not logging
- Check Gemini API key in `.env`
- Verify `enableConsoleLogging = true`
- Look for initialization message

## Performance Tips

1. **Reduce Patrol Frequency**: Increase defender's patrol delay
2. **Limit AI Calls**: Disable logging or reduce AI usage
3. **Optimize Inventory Checks**: Increase miner's return threshold
4. **Batch Building**: Let builder accumulate materials
5. **Stagger Bot Actions**: Add delays between bot spawns

## Files Reference

| File | Purpose |
|------|---------|
| `index-team.js` | Multi-bot launcher |
| `src/teamCoordinator.js` | Team coordination |
| `src/roleConfigs.js` | Role definitions |
| `src/roleBehaviorManager.js` | Role behaviors |
| `src/geminiAI.js` | AI with logging |
| `TEAM_GUIDE.md` | Full documentation |
| `TEAM_IMPLEMENTATION.md` | Technical details |

## Key Differences: Single vs Team

| Feature | Single Bot | Team Mode |
|---------|-----------|-----------|
| Bots | 1 | 3 |
| Specialization | General | High |
| Efficiency | Good | Excellent |
| Resource Use | Low | Medium-High |
| Coordination | N/A | Advanced |
| Base Defense | Basic | Dedicated |
| Building Speed | Medium | Fast |
| Mining Output | Medium | High |

## Example Workflow

**Team Mode Startup:**
1. DefenderBot spawns → starts patrol
2. BuilderBot spawns → gathers wood
3. MinerBot spawns → descends to Y=12
4. Base location shared
5. Defender patrols perimeter
6. Builder starts shelter
7. Miner begins branch mining
8. Miner returns with ores
9. Resources added to shared pool
10. Builder uses resources for expansion
11. Team coordinates on threats
12. Continuous improvement cycle

## Advanced Usage

### Monitor Team Status Programmatically
```javascript
const status = teamCoordinator.getTeamStatus();
console.log(status.defender.health);
console.log(status.sharedResources);
```

### Generate Custom Reports
```javascript
const report = teamCoordinator.generateReport();
console.log(report);
```

### Custom Help Logic
```javascript
const needsHelp = teamCoordinator.needsHelp('DefenderBot');
if (needsHelp) {
    const helper = teamCoordinator.findHelperBot('DefenderBot', position);
    // Send help request
}
```

## Documentation Links

- [TEAM_GUIDE.md](TEAM_GUIDE.md) - Comprehensive guide
- [TEAM_IMPLEMENTATION.md](TEAM_IMPLEMENTATION.md) - Technical details
- [README.md](README.md) - Main documentation
- [AI_FEATURES.md](AI_FEATURES.md) - AI capabilities

---

**Quick Start:** `npm run team` → Watch console → Monitor Telegram → Enjoy teamwork! 🤖🤖🤖

# Pokemon Battle System - Dataverse Schema

## Updated Battle System Structure

The battle system now correctly aligns with your Dataverse `pokemon_battle` table schema.

### pokemon_battle Table Fields

| Field | Type | Description |
|-------|------|-------------|
| `pokemon_battleid` | Unique ID | Primary key for the battle |
| `pokemon_player1user` | Lookup to user | First player reference |
| `pokemon_player1pokemon` | Lookup to pokedex | First player's specific Pokemon |
| `pokemon_player2user` | Lookup to user | Second player reference (null for open challenges) |
| `pokemon_player2pokemon` | Lookup to pokedex | Second player's specific Pokemon |
| `pokemon_battleresult` | Text area | JSON structure containing battle steps |
| `pokemon_winnerplayer` | Lookup to user | User who won the battle |
| `pokemon_winnerpokemon` | Lookup to pokedex | Pokemon that won the battle |
| `pokemon_challengetype` | Choice | 'open' or 'training' |
| `pokemon_status` | Choice | 'open', 'accepted', 'completed' (to be added) |
| `createdon` | DateTime | When battle was created |
| `modifiedon` | DateTime | When battle was last updated |

### Battle Flow

#### 1. Create Challenge
- Player selects Pokemon from their pokedex
- Chooses challenge type: **Training** (vs AI) or **Open** (vs players)
- Creates record in `pokemon_battle` table with:
  - `pokemon_player1user` = current user
  - `pokemon_player1pokemon` = selected pokemon
  - `pokemon_player2user` = null (for open challenges)
  - `pokemon_challengetype` = 'training' or 'open'

#### 2. Open Challenges Display
- Shows all battles where `pokemon_player2user` is null
- Displays challenger's info and Pokemon
- Other players can join by selecting their Pokemon

#### 3. Join Challenge
- Updates the battle record with:
  - `pokemon_player2user` = joining user
  - `pokemon_player2pokemon` = their selected pokemon
  - `pokemon_status` = 'accepted'

#### 4. Battle Simulation
- Backend Azure Function simulates the battle
- Stores battle steps as JSON in `pokemon_battleresult` field
- Updates `pokemon_winnerplayer` and `pokemon_winnerpokemon`
- Sets `pokemon_status` = 'completed'

#### 5. My Battles
- Shows all battles where user is `pokemon_player1user` OR `pokemon_player2user`
- Displays battle status, opponent info, and results
- Allows viewing battle replays for completed battles

### Battle Result JSON Structure

The `pokemon_battleresult` field stores a JSON object with:

```json
{
  "battleId": "guid",
  "players": {
    "player1": { "id": "user_id", "pokemon": {...} },
    "player2": { "id": "user_id", "pokemon": {...} }
  },
  "battleSteps": [
    {
      "stepNumber": 1,
      "attacker": "player1",
      "defender": "player2",
      "move": "Tackle",
      "damage": 25,
      "critical": false,
      "effectiveness": "normal",
      "attackerHpRemaining": 100,
      "defenderHpRemaining": 75,
      "message": "Player1's Pikachu used Tackle!"
    }
  ],
  "result": {
    "winner": "player1",
    "loser": "player2",
    "totalTurns": 8,
    "battleDuration": "2m 15s",
    "experienceGained": {
      "player1": 150,
      "player2": 50
    }
  }
}
```

### Key Updates Made

1. **Service Layer**: Updated `battleChallengeService.ts` to use `pokemon_battle` table
2. **Interface**: Changed from `BattleChallenge` to `PokemonBattle` interface
3. **Field Mapping**: Updated all references to match Dataverse field names
4. **Pokemon IDs**: Now using string IDs to match pokedex lookup fields
5. **Open Challenges**: Filter by `pokemon_player2user eq null` instead of status
6. **User Battles**: Filter by `pokemon_player1user` OR `pokemon_player2user` equality

### Ready for Implementation

The system is now properly aligned with your Dataverse schema and ready for:
- Real user authentication integration
- Azure Functions battle simulation endpoints
- Pokedex data integration for Pokemon details
- Status field addition to pokemon_battle table

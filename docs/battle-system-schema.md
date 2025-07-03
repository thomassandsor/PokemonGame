# Battle System Database Schema

## Challenge-Based Battle System

### pokemon_challenges
```sql
pokemon_challenges (
    challenge_id UNIQUEIDENTIFIER PRIMARY KEY,
    creator_id NVARCHAR(450),           -- Player who created challenge
    creator_pokemon_id INT,             -- Selected Pokemon ID
    challenger_id NVARCHAR(450),        -- Player who joined (NULL if open)
    challenger_pokemon_id INT,          -- Challenger's Pokemon (NULL if not joined)
    challenge_type NVARCHAR(50),        -- 'open', 'training', 'private'
    status NVARCHAR(50),                -- 'open', 'accepted', 'completed', 'expired'
    battle_result_json NTEXT,           -- JSON with complete battle simulation
    winner_id NVARCHAR(450),            -- Winner (NULL if not completed)
    created_at DATETIME2,
    updated_at DATETIME2,
    expires_at DATETIME2                -- Auto-expire old challenges
)
```

### Battle Result JSON Structure
```json
{
  "battleId": "uuid",
  "players": {
    "player1": {
      "id": "user-id",
      "pokemon": {
        "id": 25,
        "name": "Pikachu",
        "level": 10,
        "hp": 60,
        "maxHp": 60,
        "attack": 35,
        "defense": 20,
        "speed": 30,
        "types": ["electric"],
        "moves": ["Thunderbolt", "Quick Attack", "Tail Whip", "Thunder Wave"]
      }
    },
    "player2": { /* same structure */ }
  },
  "battleSteps": [
    {
      "stepNumber": 1,
      "attacker": "player1",
      "defender": "player2",
      "move": "Thunderbolt",
      "damage": 18,
      "critical": false,
      "effectiveness": "super_effective",
      "attackerHpRemaining": 60,
      "defenderHpRemaining": 42,
      "message": "Pikachu used Thunderbolt! It's super effective!"
    }
  ],
  "result": {
    "winner": "player1",
    "loser": "player2",
    "totalTurns": 3,
    "battleDuration": "12 seconds",
    "experienceGained": {
      "player1": 85,
      "player2": 25
    }
  },
  "metadata": {
    "simulatedAt": "2025-07-02T17:30:00Z",
    "simulationVersion": "1.0",
    "battleType": "challenge"
  }
}
```

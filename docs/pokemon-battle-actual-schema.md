# Pokemon Battle Table - Actual Dataverse Schema

## Schema Discovery Results

Successfully queried the `pokemon_battle` table from your Dataverse environment. Here are the **actual field names** and types:

### Primary Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `pokemon_battleid` | Uniqueidentifier | Primary key (GUID) |
| `pokemon_player1` | Lookup | Player 1 user reference |
| `pokemon_player1pokemon` | Lookup | Player 1's pokemon from pokedex |
| `pokemon_player2` | Lookup | Player 2 user reference |
| `pokemon_player2pokemon` | Lookup | Player 2's pokemon from pokedex |
| `pokemon_battleresult` | String | JSON containing battle steps |
| `pokemon_winnercontact` | Lookup | Winner user reference |
| `pokemon_winnerpokemon` | Lookup | Winning pokemon reference |
| `pokemon_challengetype` | Picklist | Challenge type (1=PVP, 2=Training) |

### Status Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `statuscode` | Status | Current status (1=open, 895550001=completed) |
| `statecode` | State | Entity state (0=active, 1=inactive) |

### System Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `createdon` | DateTime | When record was created |
| `modifiedon` | DateTime | When record was last modified |
| `createdby` | Lookup | User who created the record |
| `modifiedby` | Lookup | User who last modified the record |
| `ownerid` | Owner | Record owner |

## Key Corrections Made

### Interface Updates
- ✅ Changed `pokemon_player1user` → `pokemon_player1`
- ✅ Changed `pokemon_player2user` → `pokemon_player2`
- ✅ Changed `pokemon_winnerplayer` → `pokemon_winnercontact`
- ✅ Changed string enums → number codes for picklists/status

### Field Type Corrections
- ✅ `pokemon_challengetype`: string → number (1=PVP, 2=Training)
- ✅ `statuscode`: string → number (1=open, 895550001=completed)
- ✅ All lookup fields are string GUIDs

### OData Query Updates
- ✅ Filter open challenges: `pokemon_player2 eq null`
- ✅ Filter user battles: `(pokemon_player1 eq 'userId' or pokemon_player2 eq 'userId')`
- ✅ Updated all PATCH operations with correct field names

## Status Code Mapping

Based on actual Dataverse environment values:

| Status Code | Meaning | Used For |
|-------------|---------|----------|
| 1 | Open | New challenges waiting for opponents |
| 895550001 | Completed | Finished battles with results |

## Challenge Type Mapping

| Type Code | Meaning | Description |
|-----------|---------|-------------|
| 1 | PVP | Player vs player challenges |
| 2 | Training | AI battles for practice |

## Updated Service Behavior

1. **Create Challenge**: Sets `pokemon_challengetype` (1=PVP or 2=Training) and `statuscode` (1=Open for PVP, 895550001=Completed for Training)
2. **Open Challenges**: Filters by `pokemon_player2 eq null and statuscode eq 1 and pokemon_challengetype eq 1`
3. **Join Challenge**: Updates `pokemon_player2` and `pokemon_player2pokemon`, sets `statuscode = 895550001`
4. **Battle Results**: Reads from `pokemon_battleresult` JSON field
5. **User Battles**: Filters by player 1 OR player 2 user ID

## Ready for Implementation

The battle system now uses the **actual field names and types** from your Dataverse environment and should integrate seamlessly with your existing data structure.

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source: PowerShell query of live Dataverse environment

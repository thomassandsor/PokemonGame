// Dataverse Field Mappings for Pokemon Battle System
// These values are based on the actual Dataverse environment schema

/**
 * Status Code mappings for pokemon_battle.statuscode field
 * These are the actual status values from Dataverse
 */
export const StatusCodes = {
  OPEN: 1,           // Challenge is open and waiting for a second player
  COMPLETED: 895550001  // Battle has been completed with results
} as const;

/**
 * Challenge Type mappings for pokemon_battle.pokemon_challengetype field
 * These are the actual picklist values from Dataverse
 */
export const ChallengeTypes = {
  PVP: 1,       // Player vs Player challenge
  TRAINING: 2   // Training challenge vs AI
} as const;

/**
 * State Code mappings for pokemon_battle.statecode field
 * Standard Dataverse state codes
 */
export const StateCodes = {
  ACTIVE: 0,    // Record is active
  INACTIVE: 1   // Record is inactive
} as const;

/**
 * Type-safe enums for better TypeScript support
 */
export type StatusCode = typeof StatusCodes[keyof typeof StatusCodes];
export type ChallengeType = typeof ChallengeTypes[keyof typeof ChallengeTypes];
export type StateCode = typeof StateCodes[keyof typeof StateCodes];

/**
 * Reverse mappings for display purposes
 */
export const StatusCodeLabels: Record<StatusCode, string> = {
  [StatusCodes.OPEN]: 'Open',
  [StatusCodes.COMPLETED]: 'Completed'
};

export const ChallengeTypeLabels: Record<ChallengeType, string> = {
  [ChallengeTypes.PVP]: 'Player vs Player',
  [ChallengeTypes.TRAINING]: 'Training Battle'
};

export const StateCodeLabels: Record<StateCode, string> = {
  [StateCodes.ACTIVE]: 'Active',
  [StateCodes.INACTIVE]: 'Inactive'
};

/**
 * Helper functions for converting between user-friendly types and Dataverse codes
 */
export const DataverseUtils = {
  getChallengeTypeCode: (type: 'open' | 'training' | 'pvp'): ChallengeType => {
    switch (type) {
      case 'training':
        return ChallengeTypes.TRAINING;
      case 'open':
      case 'pvp':
        return ChallengeTypes.PVP;
      default:
        return ChallengeTypes.PVP;
    }
  },

  getStatusCodeForNewChallenge: (challengeType: ChallengeType): StatusCode => {
    // Training battles complete immediately, PVP battles start open
    return challengeType === ChallengeTypes.TRAINING ? StatusCodes.COMPLETED : StatusCodes.OPEN;
  },

  isOpenChallenge: (battle: { statuscode?: number; pokemon_challengetype?: number; pokemon_player2?: string; statecode?: number }): boolean => {
    return (
      battle.pokemon_player2 === null || battle.pokemon_player2 === undefined
    ) && (
      battle.statuscode === StatusCodes.OPEN
    ) && (
      battle.pokemon_challengetype === ChallengeTypes.PVP
    ) && (
      battle.statecode === StateCodes.ACTIVE
    );
  },

  isBattleCompleted: (battle: { statuscode?: number }): boolean => {
    return battle.statuscode === StatusCodes.COMPLETED;
  }
};

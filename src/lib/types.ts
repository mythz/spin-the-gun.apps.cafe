export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

export enum GamePhase {
  SETUP = 'SETUP',
  SPINNING = 'SPINNING',
  CHOOSING_TARGET = 'CHOOSING_TARGET',
  SHOOTING = 'SHOOTING',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  health: number;
  isAlive: boolean;
  position: number; // 0-4 for circular arrangement
  avatar: string; // emoji or color identifier
}

export interface AIMemory {
  playerId: string;
  grudges: string[]; // IDs of players who shot blanks at them
}

export interface GameState {
  players: Player[];
  currentShooter: string | null;
  selectedTarget: string | null;
  phase: GamePhase;
  revolverRotation: number;
  aiMemories: Map<string, AIMemory>;
  turnHistory: TurnRecord[];
  gameStartTime: number;
  lastSaveTime: number;
}

export interface TurnRecord {
  timestamp: number;
  shooter: string;
  target: string;
  wasBlank: boolean;
  killed: boolean;
}

export interface GameConfig {
  playerCount: number;
  startingHealth: number;
  blankProbability: number; // 0.5 for 50%
  playerShootChance: number; // 0.4 for 40%
  aiShootChance: number; // 0.6 for 60%
}

export interface SavedGame {
  id: string;
  state: GameState;
  config: GameConfig;
  lastPlayed: number;
}

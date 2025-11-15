import { GameConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  playerCount: 5, // 1 human + 4 AI
  startingHealth: 3,
  blankProbability: 0.5,
  playerShootChance: 0.4,
  aiShootChance: 0.6
};

export const AI_NAMES = [
  'Viktor', 'Natasha', 'Boris', 'Svetlana'
];

export const PLAYER_AVATARS = ['🎯', '🤖', '🎲', '🎰', '🎪'];

export const ANIMATION_DURATIONS = {
  SPIN: 3000, // 3 seconds
  SHOOT: 1500,
  DEATH: 2000,
  BLANK: 1000
};

export const STORAGE_KEYS = {
  CURRENT_GAME: 'revolver_current_game',
  SAVED_GAMES: 'revolver_saved_games',
  SETTINGS: 'revolver_settings'
};

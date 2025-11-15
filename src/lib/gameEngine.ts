import { GameState, GameConfig, Player, PlayerType, GamePhase, TurnRecord } from './types';
import { AI_NAMES, PLAYER_AVATARS } from './constants';

export class GameEngine {
  static initializeGame(config: GameConfig): GameState {
    const players: Player[] = [
      {
        id: 'player-0',
        name: 'You',
        type: PlayerType.HUMAN,
        health: config.startingHealth,
        isAlive: true,
        position: 0,
        avatar: PLAYER_AVATARS[0]
      },
      ...AI_NAMES.map((name, i) => ({
        id: `ai-${i + 1}`,
        name,
        type: PlayerType.AI,
        health: config.startingHealth,
        isAlive: true,
        position: i + 1,
        avatar: PLAYER_AVATARS[i + 1]
      }))
    ];

    return {
      players,
      currentShooter: null,
      selectedTarget: null,
      phase: GamePhase.SETUP,
      revolverRotation: 0,
      aiMemories: new Map(),
      turnHistory: [],
      gameStartTime: Date.now(),
      lastSaveTime: Date.now()
    };
  }

  static spinRevolver(state: GameState): {
    newRotation: number;
    shooterId: string;
  } {
    const alivePlayers = state.players.filter(p => p.isAlive);
    const randomIndex = Math.floor(Math.random() * alivePlayers.length);
    const shooter = alivePlayers[randomIndex];

    // Calculate rotation to point to shooter
    const rotationPerPlayer = 360 / state.players.length;
    const targetRotation = shooter.position * rotationPerPlayer;
    const spins = 3 + Math.floor(Math.random() * 3); // 3-5 full spins
    const finalRotation = (spins * 360) + targetRotation;

    return {
      newRotation: finalRotation,
      shooterId: shooter.id
    };
  }

  static attemptShot(): boolean {
    return Math.random() > 0.5; // 50% chance of success
  }

  static applyDamage(player: Player): Player {
    const newHealth = player.health - 1;
    return {
      ...player,
      health: newHealth,
      isAlive: newHealth > 0
    };
  }

  static checkGameOver(players: Player[]): {
    isOver: boolean;
    winner: Player | null;
  } {
    const alivePlayers = players.filter(p => p.isAlive);

    if (alivePlayers.length === 1) {
      return { isOver: true, winner: alivePlayers[0] };
    }

    if (alivePlayers.length === 0) {
      return { isOver: true, winner: null };
    }

    return { isOver: false, winner: null };
  }

  static recordTurn(
    state: GameState,
    shooter: string,
    target: string,
    wasBlank: boolean,
    killed: boolean
  ): GameState {
    const newHistory: TurnRecord = {
      timestamp: Date.now(),
      shooter,
      target,
      wasBlank,
      killed
    };

    return {
      ...state,
      turnHistory: [...state.turnHistory, newHistory]
    };
  }
}

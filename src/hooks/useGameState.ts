import { useReducer, useEffect } from 'react';
import { GameState, GameConfig, GamePhase } from '../lib/types';
import { GameEngine } from '../lib/gameEngine';
import { AIEngine } from '../lib/aiEngine';
import { useGameStorage } from './useGameStorage';

export type GameAction =
  | { type: 'INIT_GAME'; payload: GameConfig }
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'SPIN_REVOLVER' }
  | { type: 'SET_SPINNER_RESULT'; payload: { rotation: number; shooterId: string } }
  | { type: 'SELECT_TARGET'; payload: string }
  | { type: 'SHOOT' }
  | { type: 'SHOT_RESULT'; payload: { isHit: boolean } }
  | { type: 'NEXT_TURN' }
  | { type: 'GAME_OVER' }
  | { type: 'UPDATE_STATE'; payload: Partial<GameState> };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME':
      return GameEngine.initializeGame(action.payload);

    case 'LOAD_GAME':
      return action.payload;

    case 'SPIN_REVOLVER':
      return { ...state, phase: GamePhase.SPINNING };

    case 'SET_SPINNER_RESULT':
      return {
        ...state,
        revolverRotation: action.payload.rotation,
        currentShooter: action.payload.shooterId,
        phase: GamePhase.CHOOSING_TARGET
      };

    case 'SELECT_TARGET':
      return {
        ...state,
        selectedTarget: action.payload
      };

    case 'SHOOT':
      return {
        ...state,
        phase: GamePhase.SHOOTING
      };

    case 'SHOT_RESULT': {
      const { isHit } = action.payload;
      const targetIndex = state.players.findIndex(
        p => p.id === state.selectedTarget
      );
      const target = state.players[targetIndex];

      let newPlayers = [...state.players];
      let killed = false;

      if (isHit) {
        newPlayers[targetIndex] = GameEngine.applyDamage(target);
        killed = !newPlayers[targetIndex].isAlive;
      }

      let newMemories = state.aiMemories;
      if (!isHit && state.currentShooter === 'player-0') {
        newMemories = AIEngine.updateMemory(
          state.aiMemories,
          state.selectedTarget!,
          state.currentShooter,
          true
        );
      }

      return GameEngine.recordTurn(
        {
          ...state,
          players: newPlayers,
          aiMemories: newMemories
        },
        state.currentShooter!,
        state.selectedTarget!,
        !isHit,
        killed
      );
    }

    case 'NEXT_TURN':
      return {
        ...state,
        phase: GamePhase.SETUP,
        currentShooter: null,
        selectedTarget: null
      };

    case 'GAME_OVER':
      return {
        ...state,
        phase: GamePhase.GAME_OVER
      };

    case 'UPDATE_STATE':
      return {
        ...state,
        ...action.payload
      };

    default:
      return state;
  }
}

export function useGameState(config: GameConfig) {
  const [state, dispatch] = useReducer(
    gameReducer,
    GameEngine.initializeGame(config)
  );

  const { saveGame } = useGameStorage();

  // Auto-save every 10 seconds
  useEffect(() => {
    if (state.phase !== GamePhase.SETUP && state.phase !== GamePhase.GAME_OVER) {
      const interval = setInterval(() => {
        saveGame(state, config);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [state, config, saveGame]);

  return { state, dispatch };
}

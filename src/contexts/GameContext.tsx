import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { GameState, GameConfig, PlayerType } from '../lib/types';
import { GameEngine } from '../lib/gameEngine';
import { AIEngine } from '../lib/aiEngine';
import { useGameState, GameAction } from '../hooks/useGameState';
import { GAME_CONFIG, ANIMATION_DURATIONS } from '../lib/constants';

interface GameContextType {
  state: GameState;
  config: GameConfig;
  dispatch: React.Dispatch<GameAction>;
  spinRevolver: () => void;
  selectTarget: (targetId: string) => void;
  shoot: () => void;
  startNewGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const config = GAME_CONFIG;
  const { state, dispatch } = useGameState(config);

  const spinRevolver = useCallback(() => {
    dispatch({ type: 'SPIN_REVOLVER' });

    setTimeout(() => {
      const result = GameEngine.spinRevolver(state);
      dispatch({
        type: 'SET_SPINNER_RESULT',
        payload: { rotation: result.newRotation, shooterId: result.shooterId }
      });

      // If AI shooter, execute AI turn
      const shooter = state.players.find(p => p.id === result.shooterId);
      if (shooter?.type === PlayerType.AI) {
        setTimeout(() => {
          AIEngine.executeAITurn(state, config, (newState) => {
            dispatch({ type: 'UPDATE_STATE', payload: newState });
          });
        }, 1000);
      }
    }, ANIMATION_DURATIONS.SPIN);
  }, [state, dispatch, config]);

  const selectTarget = useCallback((targetId: string) => {
    dispatch({ type: 'SELECT_TARGET', payload: targetId });
  }, [dispatch]);

  const shoot = useCallback(() => {
    dispatch({ type: 'SHOOT' });

    setTimeout(() => {
      const isHit = GameEngine.attemptShot();
      dispatch({ type: 'SHOT_RESULT', payload: { isHit } });

      setTimeout(() => {
        const gameOverCheck = GameEngine.checkGameOver(state.players);
        if (gameOverCheck.isOver) {
          dispatch({ type: 'GAME_OVER' });
        } else {
          dispatch({ type: 'NEXT_TURN' });
        }
      }, ANIMATION_DURATIONS.SHOOT);
    }, 500);
  }, [state, dispatch]);

  const startNewGame = useCallback(() => {
    dispatch({ type: 'INIT_GAME', payload: config });
  }, [config, dispatch]);

  return (
    <GameContext.Provider
      value={{
        state,
        config,
        dispatch,
        spinRevolver,
        selectTarget,
        shoot,
        startNewGame
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

import { useEffect, useState } from 'react';
import { gameStorage } from '../lib/storage';
import { GameState, GameConfig, SavedGame } from '../lib/types';
import { STORAGE_KEYS } from '../lib/constants';

export function useGameStorage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    gameStorage.init().then(() => setIsReady(true));
  }, []);

  const saveGame = async (state: GameState, config: GameConfig) => {
    const savedGame: SavedGame = {
      id: crypto.randomUUID(),
      state,
      config,
      lastPlayed: Date.now()
    };

    await gameStorage.saveCurrentGame(savedGame);
    await gameStorage.saveGame(savedGame);
  };

  const loadGame = async (): Promise<SavedGame | null> => {
    return await gameStorage.getCurrentGame();
  };

  const clearCurrentGame = async () => {
    if ((gameStorage as any).db) {
      await (gameStorage as any).db.delete('settings', STORAGE_KEYS.CURRENT_GAME);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
    }
  };

  return {
    isReady,
    saveGame,
    loadGame,
    clearCurrentGame
  };
}

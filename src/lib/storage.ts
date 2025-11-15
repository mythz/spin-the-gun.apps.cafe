import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedGame } from './types';
import { STORAGE_KEYS } from './constants';

interface RevolverDB extends DBSchema {
  games: {
    key: string;
    value: SavedGame;
    indexes: { 'by-date': number };
  };
  settings: {
    key: string;
    value: any;
  };
}

class GameStorage {
  private db: IDBPDatabase<RevolverDB> | null = null;

  async init(): Promise<void> {
    try {
      this.db = await openDB<RevolverDB>('revolver-game', 1, {
        upgrade(db) {
          const gameStore = db.createObjectStore('games', { keyPath: 'id' });
          gameStore.createIndex('by-date', 'lastPlayed');
          db.createObjectStore('settings');
        },
      });
    } catch (error) {
      console.error('IndexedDB failed, using localStorage fallback');
    }
  }

  async saveGame(game: SavedGame): Promise<void> {
    if (this.db) {
      await this.db.put('games', game);
    } else {
      localStorage.setItem(
        `${STORAGE_KEYS.SAVED_GAMES}_${game.id}`,
        JSON.stringify(game)
      );
    }
  }

  async loadGame(id: string): Promise<SavedGame | null> {
    if (this.db) {
      return (await this.db.get('games', id)) || null;
    } else {
      const data = localStorage.getItem(`${STORAGE_KEYS.SAVED_GAMES}_${id}`);
      return data ? JSON.parse(data) : null;
    }
  }

  async getCurrentGame(): Promise<SavedGame | null> {
    if (this.db) {
      return (await this.db.get('settings', STORAGE_KEYS.CURRENT_GAME)) || null;
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
      return data ? JSON.parse(data) : null;
    }
  }

  async saveCurrentGame(game: SavedGame): Promise<void> {
    if (this.db) {
      await this.db.put('settings', game, STORAGE_KEYS.CURRENT_GAME);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(game));
    }
  }

  async deleteGame(id: string): Promise<void> {
    if (this.db) {
      await this.db.delete('games', id);
    } else {
      localStorage.removeItem(`${STORAGE_KEYS.SAVED_GAMES}_${id}`);
    }
  }

  async getAllGames(): Promise<SavedGame[]> {
    if (this.db) {
      return await this.db.getAllFromIndex('games', 'by-date');
    } else {
      const games: SavedGame[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEYS.SAVED_GAMES)) {
          const data = localStorage.getItem(key);
          if (data) games.push(JSON.parse(data));
        }
      }
      return games.sort((a, b) => b.lastPlayed - a.lastPlayed);
    }
  }
}

export const gameStorage = new GameStorage();

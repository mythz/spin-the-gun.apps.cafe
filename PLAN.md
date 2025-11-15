# Revolver Roulette Game - Complete Implementation Plan

## 1. Project Overview

### 1.1 Game Concept
A turn-based Russian Roulette style game where players (1 human + 4 AI bots) take turns spinning a revolver. The player who the revolver points to gets to choose a target to shoot. Shots have a 50% chance of being blank. AI bots remember who shot them with blanks and will retaliate.

### 1.2 Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Storage**: IndexedDB (via idb library) + localStorage fallback
- **Animations**: Framer Motion
- **State Management**: React Context + useReducer
- **Deployment**: Static hosting compatible (Netlify, Vercel, GitHub Pages)

---

## 2. Project Structure

```
/src
  /components
    /game
      GameBoard.tsx          # Main game container
      PlayerCircle.tsx       # Circular arrangement of players
      RevolverSpinner.tsx    # Animated revolver spinner
      PlayerCard.tsx         # Individual player display
      ShootingAnimation.tsx  # Shot/blank animation
      GameControls.tsx       # Action buttons
      GameStatus.tsx         # Current turn/status display
    /ui
      Button.tsx             # Reusable button component
      Modal.tsx              # Modal for game over/instructions
      HealthBar.tsx          # Player health display
      AnimatedBackground.tsx # Particle/ambient effects
  /contexts
    GameContext.tsx          # Game state management
  /hooks
    useGameStorage.ts        # IndexedDB/localStorage hook
    useGameState.ts          # Game logic hook
    useAIDecision.ts         # AI behavior logic
  /lib
    gameEngine.ts            # Core game logic
    aiEngine.ts              # AI decision making
    storage.ts               # Storage utilities
    constants.ts             # Game constants
    types.ts                 # TypeScript interfaces
    utils.ts                 # Helper functions
  /styles
    globals.css              # Global styles
  App.tsx                    # Root component
  main.tsx                   # Entry point
```

---

## 3. Data Models & Types

### 3.1 Core Types (`src/lib/types.ts`)

```typescript
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
```

---

## 4. Game Constants (`src/lib/constants.ts`)

```typescript
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
```

---

## 5. Storage Layer (`src/lib/storage.ts`)

### 5.1 IndexedDB Setup with idb

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
```

---

## 6. Game Engine (`src/lib/gameEngine.ts`)

### 6.1 Core Game Logic

```typescript
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
```

---

## 7. AI Engine (`src/lib/aiEngine.ts`)

### 7.1 AI Decision Making

```typescript
export class AIEngine {
  static decideTarget(
    aiPlayer: Player,
    allPlayers: Player[],
    aiMemories: Map<string, AIMemory>,
    config: GameConfig
  ): string {
    const memory = aiMemories.get(aiPlayer.id);
    const alivePlayers = allPlayers.filter(
      p => p.isAlive && p.id !== aiPlayer.id
    );

    // Priority 1: Revenge - shoot players who shot blanks at this AI
    if (memory && memory.grudges.length > 0) {
      const grudgeTargets = alivePlayers.filter(
        p => memory.grudges.includes(p.id)
      );
      
      if (grudgeTargets.length > 0) {
        // 80% chance to shoot a grudge target
        if (Math.random() < 0.8) {
          return grudgeTargets[
            Math.floor(Math.random() * grudgeTargets.length)
          ].id;
        }
      }
    }

    // Priority 2: Target human player
    const humanPlayer = alivePlayers.find(p => p.type === PlayerType.HUMAN);
    if (humanPlayer) {
      // 60% chance to target human
      if (Math.random() < 0.6) {
        return humanPlayer.id;
      }
    }

    // Priority 3: Target lowest health AI
    const aiTargets = alivePlayers.filter(p => p.type === PlayerType.AI);
    if (aiTargets.length > 0) {
      aiTargets.sort((a, b) => a.health - b.health);
      return aiTargets[0].id;
    }

    // Fallback: random target
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
  }

  static updateMemory(
    aiMemories: Map<string, AIMemory>,
    targetId: string,
    shooterId: string,
    wasBlank: boolean
  ): Map<string, AIMemory> {
    const newMemories = new Map(aiMemories);
    
    if (wasBlank && targetId.startsWith('ai-')) {
      const memory = newMemories.get(targetId) || {
        playerId: targetId,
        grudges: []
      };
      
      if (!memory.grudges.includes(shooterId)) {
        memory.grudges.push(shooterId);
      }
      
      newMemories.set(targetId, memory);
    }

    return newMemories;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async executeAITurn(
    state: GameState,
    config: GameConfig,
    onUpdate: (newState: GameState) => void
  ): Promise<void> {
    const shooter = state.players.find(p => p.id === state.currentShooter);
    if (!shooter || shooter.type !== PlayerType.AI) return;

    // AI "thinking" delay
    await this.delay(1000 + Math.random() * 1000);

    // Decide target
    const targetId = this.decideTarget(
      shooter,
      state.players,
      state.aiMemories,
      config
    );

    // Update state with target selection
    onUpdate({
      ...state,
      selectedTarget: targetId,
      phase: GamePhase.SHOOTING
    });

    await this.delay(500);

    // Execute shot
    const isHit = GameEngine.attemptShot();
    const targetIndex = state.players.findIndex(p => p.id === targetId);
    const target = state.players[targetIndex];

    let newPlayers = [...state.players];
    let killed = false;

    if (isHit) {
      newPlayers[targetIndex] = GameEngine.applyDamage(target);
      killed = !newPlayers[targetIndex].isAlive;
    }

    // Update memories if blank
    let newMemories = state.aiMemories;
    if (!isHit) {
      newMemories = this.updateMemory(
        state.aiMemories,
        targetId,
        shooter.id,
        true
      );
    }

    const newState = GameEngine.recordTurn(
      {
        ...state,
        players: newPlayers,
        aiMemories: newMemories
      },
      shooter.id,
      targetId,
      !isHit,
      killed
    );

    onUpdate(newState);

    await this.delay(ANIMATION_DURATIONS.SHOOT);

    // Check game over
    const gameOverCheck = GameEngine.checkGameOver(newPlayers);
    if (gameOverCheck.isOver) {
      onUpdate({
        ...newState,
        phase: GamePhase.GAME_OVER
      });
    } else {
      // Next turn
      onUpdate({
        ...newState,
        phase: GamePhase.SETUP,
        currentShooter: null,
        selectedTarget: null
      });
    }
  }
}
```

---

## 8. React Hooks

### 8.1 Game Storage Hook (`src/hooks/useGameStorage.ts`)

```typescript
import { useEffect, useState } from 'react';

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
    if (gameStorage['db']) {
      await gameStorage['db'].delete('settings', STORAGE_KEYS.CURRENT_GAME);
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
```

### 8.2 Game State Hook (`src/hooks/useGameState.ts`)

```typescript
import { useReducer, useCallback, useEffect } from 'react';

type GameAction =
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
  }, [state, config]);

  return { state, dispatch };
}
```

---

## 9. React Components

### 9.1 Game Context (`src/contexts/GameContext.tsx`)

```typescript
import React, { createContext, useContext, ReactNode } from 'react';

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
        payload: result
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
```

### 9.2 Player Circle Component (`src/components/game/PlayerCircle.tsx`)

```typescript
import { motion } from 'framer-motion';
import PlayerCard from './PlayerCard';

export default function PlayerCircle() {
  const { state } = useGame();
  const radius = 200; // pixels from center
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {state.players.map((player, index) => {
        const angle = (index * 360) / state.players.length;
        const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
        const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;
        
        return (
          <motion.div
            key={player.id}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <PlayerCard player={player} />
          </motion.div>
        );
      })}
    </div>
  );
}
```

### 9.3 Revolver Spinner Component (`src/components/game/RevolverSpinner.tsx`)

```typescript
import { motion } from 'framer-motion';

export default function RevolverSpinner() {
  const { state } = useGame();
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        className="w-32 h-32 relative"
        animate={{ rotate: state.revolverRotation }}
        transition={{
          duration: 3,
          ease: [0.43, 0.13, 0.23, 0.96]
        }}
      >
        {/* Revolver cylinder */}
        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 to-gray-900 shadow-2xl border-4 border-gray-600 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            {/* Chambers */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * (Math.PI / 180);
              const x = Math.cos(angle) * 25;
              const y = Math.sin(angle) * 25;
              
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-gray-950"
                  style={{
                    transform: `translate(${x}px, ${y}px)`
                  }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-red-600" />
        </div>
      </motion.div>
    </div>
  );
}
```

### 9.4 Player Card Component (`src/components/game/PlayerCard.tsx`)

```typescript
import { motion } from 'framer-motion';
import HealthBar from '../ui/HealthBar';

interface Props {
  player: Player;
}

export default function PlayerCard({ player }: Props) {
  const { state, selectTarget } = useGame();
  
  const isShooter = state.currentShooter === player.id;
  const isTarget = state.selectedTarget === player.id;
  const canBeTargeted = 
    state.phase === GamePhase.CHOOSING_TARGET &&
    state.currentShooter === 'player-0' &&
    player.isAlive &&
    player.id !== 'player-0';
  
  return (
    <motion.div
      className={`
        relative p-4 rounded-lg border-2 min-w-32
        ${!player.isAlive ? 'opacity-40 grayscale' : ''}
        ${isShooter ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white'}
        ${isTarget ? 'ring-4 ring-red-500' : ''}
        ${canBeTargeted ? 'cursor-pointer hover:border-red-400' : ''}
      `}
      onClick={() => canBeTargeted && selectTarget(player.id)}
      whileHover={canBeTargeted ? { scale: 1.1 } : {}}
      animate={isShooter ? {
        boxShadow: [
          '0 0 0 0 rgba(251, 191, 36, 0)',
          '0 0 0 8px rgba(251, 191, 36, 0.4)',
          '0 0 0 0 rgba(251, 191, 36, 0)'
        ]
      } : {}}
      transition={{ duration: 1.5, repeat: isShooter ? Infinity : 0 }}
    >
      {/* Avatar */}
      <div className="text-4xl mb-2 text-center">
        {player.avatar}
      </div>
      
      {/* Name */}
      <div className="font-bold text-center mb-2">
        {player.name}
      </div>
      
      {/* Health */}
      <HealthBar current={player.health} max={GAME_CONFIG.startingHealth} />
      
      {/* Status indicators */}
      {isShooter && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold">
          SHOOTER
        </div>
      )}
      
      {!player.isAlive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg">
          <span className="text-white text-2xl font-bold">💀</span>
        </div>
      )}
    </motion.div>
  );
}
```

### 9.5 Shooting Animation (`src/components/game/ShootingAnimation.tsx`)

```typescript
import { motion, AnimatePresence } from 'framer-motion';

export default function ShootingAnimation() {
  const { state } = useGame();
  
  const shooter = state.players.find(p => p.id === state.currentShooter);
  const target = state.players.find(p => p.id === state.selectedTarget);
  
  if (!shooter || !target || state.phase !== GamePhase.SHOOTING) {
    return null;
  }
  
  const lastTurn = state.turnHistory[state.turnHistory.length - 1];
  const wasBlank = lastTurn?.wasBlank;
  
  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Bullet/Blank animation */}
        <motion.div
          className={`text-6xl ${wasBlank ? '' : 'text-red-600'}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1 }}
        >
          {wasBlank ? '💨' : '💥'}
        </motion.div>
        
        {/* Flash effect */}
        {!wasBlank && (
          <motion.div
            className="absolute inset-0 bg-red-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 9.6 Game Board (`src/components/game/GameBoard.tsx`)

```typescript
import PlayerCircle from './PlayerCircle';
import RevolverSpinner from './RevolverSpinner';
import GameControls from './GameControls';
import GameStatus from './GameStatus';
import ShootingAnimation from './ShootingAnimation';
import AnimatedBackground from '../ui/AnimatedBackground';

export default function GameBoard() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto h-full flex flex-col">
        {/* Status bar */}
        <div className="pt-8">
          <GameStatus />
        </div>
        
        {/* Game area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[600px] h-[600px]">
            <PlayerCircle />
            <RevolverSpinner />
            <ShootingAnimation />
          </div>
        </div>
        
        {/* Controls */}
        <div className="pb-8">
          <GameControls />
        </div>
      </div>
    </div>
  );
}
```

### 9.7 Game Controls (`src/components/game/GameControls.tsx`)

```typescript
import Button from '../ui/Button';

export default function GameControls() {
  const { state, spinRevolver, shoot } = useGame();
  
  const canSpin = state.phase === GamePhase.SETUP;
  const canShoot = 
    state.phase === GamePhase.CHOOSING_TARGET &&
    state.currentShooter === 'player-0' &&
    state.selectedTarget !== null;
  
  return (
    <div className="flex justify-center gap-4">
      <Button
        onClick={spinRevolver}
        disabled={!canSpin}
        variant="primary"
        size="lg"
      >
        🎰 Spin Revolver
      </Button>
      
      <Button
        onClick={shoot}
        disabled={!canShoot}
        variant="danger"
        size="lg"
      >
        🔫 Shoot
      </Button>
    </div>
  );
}
```

### 9.8 Game Status (`src/components/game/GameStatus.tsx`)

```typescript
export default function GameStatus() {
  const { state } = useGame();
  
  const shooter = state.players.find(p => p.id === state.currentShooter);
  const alivePlayers = state.players.filter(p => p.isAlive);
  
  const getStatusMessage = () => {
    switch (state.phase) {
      case GamePhase.SETUP:
        return 'Press "Spin Revolver" to begin the turn';
      case GamePhase.SPINNING:
        return 'Spinning...';
      case GamePhase.CHOOSING_TARGET:
        if (shooter?.type === PlayerType.HUMAN) {
          return 'Choose your target!';
        }
        return `${shooter?.name} is choosing a target...`;
      case GamePhase.SHOOTING:
        return 'BANG!';
      case GamePhase.GAME_OVER:
        const winner = state.players.find(p => p.isAlive);
        return winner
          ? `${winner.name} wins!`
          : 'Everyone is dead!';
      default:
        return '';
    }
  };
  
  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 text-white">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold mb-2">{getStatusMessage()}</h2>
        <p className="text-sm opacity-80">
          {alivePlayers.length} players remaining
        </p>
      </div>
      
      {shooter && state.phase !== GamePhase.SETUP && (
        <div className="text-center">
          <span className="text-yellow-400 font-bold">
            Current Shooter: {shooter.name}
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## 10. UI Components

### 10.1 Button (`src/components/ui/Button.tsx`)

```typescript
import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  const baseStyles = 'font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 10.2 Health Bar (`src/components/ui/HealthBar.tsx`)

```typescript
interface Props {
  current: number;
  max: number;
}

export default function HealthBar({ current, max }: Props) {
  const hearts = Array.from({ length: max }, (_, i) => i < current);
  
  return (
    <div className="flex justify-center gap-1">
      {hearts.map((filled, i) => (
        <span key={i} className="text-xl">
          {filled ? '❤️' : '🖤'}
        </span>
      ))}
    </div>
  );
}
```

### 10.3 Modal (`src/components/ui/Modal.tsx`)

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 pointer-events-auto">
              <h2 className="text-2xl font-bold mb-4">{title}</h2>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### 10.4 Animated Background (`src/components/ui/AnimatedBackground.tsx`)

```typescript
import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          transition={{
            duration: 10 + Math.random() * 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  );
}
```

---

## 11. App Entry Point

### 11.1 App.tsx

```typescript
import { useState, useEffect } from 'react';
import { GameProvider } from './contexts/GameContext';
import GameBoard from './components/game/GameBoard';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { useGameStorage } from './hooks/useGameStorage';

function App() {
  const [showInstructions, setShowInstructions] = useState(true);
  const { isReady, loadGame } = useGameStorage();
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    if (isReady) {
      loadGame().then(saved => {
        setHasSavedGame(!!saved);
      });
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <GameProvider>
      <GameBoard />
      
      <Modal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        title="Revolver Roulette"
      >
        <div className="space-y-4">
          <p>Welcome to Revolver Roulette!</p>
          
          <div className="space-y-2 text-sm">
            <p><strong>Rules:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Spin the revolver to select a shooter</li>
              <li>The shooter chooses a target</li>
              <li>50% chance the shot is a blank</li>
              <li>If you shoot an AI with a blank, they'll target you later!</li>
              <li>Last player standing wins</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setShowInstructions(false)}
            >
              Start New Game
            </Button>
            
            {hasSavedGame && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  // Load saved game logic
                  setShowInstructions(false);
                }}
              >
                Continue Saved Game
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </GameProvider>
  );
}

export default App;
```

---

## 12. Build Configuration

### 12.1 package.json

```json
{
  "name": "revolver-roulette",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.0.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

### 12.2 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // For static deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'animation-vendor': ['framer-motion']
        }
      }
    }
  }
});
```

### 12.3 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 12.4 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 13. Implementation Checklist

### Phase 1: Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (framer-motion, idb, tailwindcss)
- [ ] Configure Tailwind CSS
- [ ] Set up project structure

### Phase 2: Core Logic
- [ ] Implement type definitions
- [ ] Create game constants
- [ ] Build GameEngine class
- [ ] Build AIEngine class
- [ ] Implement storage layer (IndexedDB + localStorage)

### Phase 3: React Infrastructure
- [ ] Create GameContext and provider
- [ ] Implement useGameState hook
- [ ] Implement useGameStorage hook
- [ ] Set up game reducer

### Phase 4: UI Components
- [ ] Build base UI components (Button, Modal, HealthBar)
- [ ] Create PlayerCard component
- [ ] Create PlayerCircle layout
- [ ] Build RevolverSpinner with animations
- [ ] Implement GameStatus display
- [ ] Create GameControls

### Phase 5: Game Flow
- [ ] Wire up spin revolver logic
- [ ] Implement target selection (human)
- [ ] Implement AI target selection
- [ ] Add shooting mechanics
- [ ] Create shooting animations
- [ ] Implement game over detection

### Phase 6: Polish
- [ ] Add AnimatedBackground
- [ ] Implement auto-save functionality
- [ ] Add game instructions modal
- [ ] Create continue game feature
- [ ] Add sound effects (optional)
- [ ] Optimize animations

### Phase 7: Testing & Deployment
- [ ] Test all game flows
- [ ] Test AI behavior and grudges
- [ ] Verify storage persistence
- [ ] Build for production
- [ ] Deploy to static hosting
- [ ] Test deployed version

---

## 14. Key Implementation Notes

1. **Turn Flow**: The game alternates between SETUP → SPINNING → CHOOSING_TARGET → SHOOTING → back to SETUP
2. **AI Timing**: Use delays (via AIEngine.delay) to make AI decisions feel natural
3. **Memory Persistence**: Auto-save every 10 seconds during active gameplay
4. **Grudge System**: Store in aiMemories Map, check on AI target selection
5. **Animations**: Use Framer Motion for smooth transitions, especially revolver spin
6. **Probability**: Human player has 40% chance to be shooter, AI has 60% (60/40 split among 4 AIs = 15% each)
7. **Static Hosting**: Use relative paths (base: './') and client-side storage only

This plan provides complete implementation details for an LLM to build the entire game from scratch.
import { Player, AIMemory, GameState, GameConfig, PlayerType, GamePhase } from './types';
import { GameEngine } from './gameEngine';
import { ANIMATION_DURATIONS } from './constants';

export class AIEngine {
  static decideTarget(
    aiPlayer: Player,
    allPlayers: Player[],
    aiMemories: Map<string, AIMemory>,
    _config: GameConfig
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
      phase: GamePhase.CHOOSING_TARGET
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
        aiMemories: newMemories,
        phase: GamePhase.SHOOTING
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

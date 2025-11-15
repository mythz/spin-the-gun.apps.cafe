import { useGame } from '../../contexts/GameContext';
import { GamePhase } from '../../lib/types';
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

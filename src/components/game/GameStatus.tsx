import { useGame } from '../../contexts/GameContext';
import { GamePhase, PlayerType } from '../../lib/types';

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

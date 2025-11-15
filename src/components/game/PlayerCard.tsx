import { motion } from 'framer-motion';
import { Player, GamePhase } from '../../lib/types';
import { useGame } from '../../contexts/GameContext';
import HealthBar from '../ui/HealthBar';
import { GAME_CONFIG } from '../../lib/constants';

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

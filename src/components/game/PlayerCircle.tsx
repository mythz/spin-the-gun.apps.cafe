import { motion } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';
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

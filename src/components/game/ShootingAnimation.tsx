import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';
import { GamePhase } from '../../lib/types';

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

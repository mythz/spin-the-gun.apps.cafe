import { motion } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';

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

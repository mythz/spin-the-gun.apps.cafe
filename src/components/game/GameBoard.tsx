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

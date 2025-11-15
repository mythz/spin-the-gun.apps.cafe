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
  }, [isReady, loadGame]);

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

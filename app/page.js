'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './game/GameCanvas';
import { CHARACTERS, drawCharacter, getUnlockedCharacters, getLockedCharacters } from './game/Characters';
import { soundManager } from './game/SoundManager';

export default function Home() {
  const [screen, setScreen] = useState('menu'); // menu, playing, result, charSelect
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [newUnlocks, setNewUnlocks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('infiniteStairs_highScore');
    if (saved) setHighScore(parseInt(saved));
    const savedChar = localStorage.getItem('infiniteStairs_selectedChar');
    if (savedChar) {
      const found = CHARACTERS.find(c => c.id === savedChar);
      if (found) setSelectedChar(found);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    soundManager.init();
    soundManager.playStartGame();
    setGameKey(prev => prev + 1);
    setScreen('playing');
  }, []);

  const handleGameOver = useCallback((score, newHigh, unlocks) => {
    setLastScore(score);
    setHighScore(newHigh);
    setIsNewRecord(score >= newHigh && score > 0);
    setNewUnlocks(unlocks || []);
    setScreen('result');
  }, []);

  const handleCharSelect = useCallback(() => {
    setScreen('charSelect');
  }, []);

  const handleSelectCharacter = useCallback((char) => {
    const hs = parseInt(localStorage.getItem('infiniteStairs_highScore') || '0');
    if (hs >= char.unlockScore) {
      setSelectedChar(char);
      localStorage.setItem('infiniteStairs_selectedChar', char.id);
    }
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const toggleMute = useCallback(() => {
    soundManager.init();
    const isMuted = soundManager.toggleMute();
    setMuted(isMuted);
  }, []);

  return (
    <div className="app-container">
      {/* Background decorations */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Mute button */}
      <button className="mute-btn" onClick={toggleMute} id="btn-mute">
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Version Tag */}
      {screen !== 'playing' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 200,
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.25)',
          fontFamily: '"Outfit", sans-serif',
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          userSelect: 'none'
        }}>
          v0.1.0
        </div>
      )}

      {/* Main Menu Screen */}
      <div className={`screen main-menu ${screen === 'menu' ? 'visible' : 'hidden'}`}>
        <div className="game-logo fade-in-up fade-in-up-1">
          <div className="stairs-animation">
            <div className="stair-block" />
            <div className="stair-block" />
            <div className="stair-block" />
            <div className="stair-block" />
            <div className="stair-block" />
            <div className="stair-block" />
          </div>
        </div>
        <h1 className="game-title fade-in-up fade-in-up-2">무한의 계단</h1>
        <p className="game-subtitle fade-in-up fade-in-up-2">INFINITE STAIRS</p>

        <CharacterPreview character={selectedChar} />

        {highScore > 0 && (
          <div className="high-score-badge fade-in-up fade-in-up-3">
            👑 최고 기록: {highScore}층
          </div>
        )}

        <div className="menu-buttons fade-in-up fade-in-up-4">
          <button className="btn-play" onClick={handleStartGame} id="btn-start">
            🎮 게임 시작
          </button>
          <button className="btn-secondary" onClick={handleCharSelect} id="btn-chars">
            🎭 캐릭터 선택
          </button>
        </div>
      </div>

      {/* Game Screen */}
      <div className={`screen game-screen ${screen === 'playing' ? 'visible' : 'hidden'}`}>
        {screen === 'playing' && (
          <GameCanvas
            key={gameKey}
            character={selectedChar}
            onGameOver={handleGameOver}
            gameState="playing"
          />
        )}
      </div>

      {/* Result Screen */}
      <div className={`screen result-screen ${screen === 'result' ? 'visible' : 'hidden'}`}>
        <h2 className={`result-title fade-in-up fade-in-up-1 ${lastScore >= 50 ? 'good' : 'bad'}`}>
          {lastScore >= 100 ? '🎉 대단해요!' : lastScore >= 50 ? '👏 잘했어요!' : '💪 다시 도전!'}
        </h2>

        <div className="result-score-card fade-in-up fade-in-up-2">
          <div className="result-score-label">최종 점수</div>
          <div className="result-score-value">{lastScore}</div>
          <div className="result-highscore">
            👑 최고 기록: {highScore}층
          </div>
        </div>

        {isNewRecord && (
          <div className="result-new-record fade-in-up fade-in-up-3">
            🏆 신기록 달성!
          </div>
        )}

        {newUnlocks.length > 0 && (
          <div className="unlock-section fade-in-up fade-in-up-3">
            <div className="unlock-title">🎉 새 캐릭터 해금!</div>
            {newUnlocks.map(char => (
              <UnlockCard key={char.id} character={char} />
            ))}
          </div>
        )}

        <div className="result-buttons fade-in-up fade-in-up-4">
          <button className="btn-play" onClick={handleStartGame} id="btn-retry">
            🔄 다시 도전
          </button>
          <button className="btn-secondary" onClick={handleBackToMenu} id="btn-to-menu">
            🏠 메인 화면
          </button>
        </div>
      </div>

      {/* Character Select Screen */}
      <div className={`screen char-select-screen ${screen === 'charSelect' ? 'visible' : 'hidden'}`}>
        <h2 className="screen-title fade-in-up fade-in-up-1">🎭 캐릭터 선택</h2>

        <div className="char-grid fade-in-up fade-in-up-2">
          {CHARACTERS.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={selectedChar.id === char.id}
              isLocked={highScore < char.unlockScore}
              onClick={() => handleSelectCharacter(char)}
            />
          ))}
        </div>

        <div className="char-select-footer fade-in-up fade-in-up-3">
          <button className="btn-secondary" onClick={handleBackToMenu} id="btn-back-to-menu">
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// Character Preview for main menu
function CharacterPreview({ character }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animId;

    const animate = () => {
      ctx.clearRect(0, 0, 100, 100);
      drawCharacter(ctx, 50, 60, character, 1, frame, 1.5);
      frame++;
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, [character]);

  return (
    <div className="menu-char-preview fade-in-up fade-in-up-3">
      <canvas ref={canvasRef} width={100} height={100} />
    </div>
  );
}

// Character Card for selection screen
function CharacterCard({ character, isSelected, isLocked, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animId;

    const animate = () => {
      ctx.clearRect(0, 0, 70, 70);
      drawCharacter(ctx, 35, 45, character, 1, frame, 1.2);
      frame++;
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, [character]);

  return (
    <div
      className={`char-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} width={70} height={70} />
      <div className="char-name">{character.name}</div>
      <div className="char-desc">{character.description}</div>
      {isLocked && (
        <div className="char-lock-badge">
          🔒 {character.unlockScore}점 필요
        </div>
      )}
    </div>
  );
}

// Unlock Card for result screen
function UnlockCard({ character }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animId;

    const animate = () => {
      ctx.clearRect(0, 0, 50, 50);
      drawCharacter(ctx, 25, 35, character, 1, frame, 1);
      frame++;
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animId);
  }, [character]);

  return (
    <div className="unlock-card">
      <canvas ref={canvasRef} width={50} height={50} />
      <div className="unlock-info">
        <div className="unlock-char-name">{character.name}</div>
        <div className="unlock-char-desc">{character.description}</div>
      </div>
    </div>
  );
}

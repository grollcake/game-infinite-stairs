'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './game/GameCanvas';
import { CHARACTERS, drawCharacter, getUnlockedCharacters, getLockedCharacters } from './game/Characters';
import { soundManager } from './game/SoundManager';

const SHOP_ITEMS = {
  upgrades: [
    { id: 'energyMaster', name: '에너지 마스터', desc: '에너지 감소 속도 20% 감소', price: 200, icon: '🔋' },
    { id: 'recoveryBoost', name: '체력 강화', desc: '에너지 회복량 30% 증가', price: 200, icon: '💪' },
    { id: 'coinBooster', name: '코인 부스터', desc: '코인 획득량 2배', price: 300, icon: '💰' },
    { id: 'itemLuck', name: '행운의 부적', desc: '아이템 출현 빈도 20% 증가', price: 250, icon: '🍀' },
  ],
  consumables: [
    { id: 'startShield', name: '시작 쉴드', desc: '게임 시작 시 쉴드 보유', price: 30, icon: '🛡️' },
    { id: 'feverStart', name: '피버 부스트', desc: '게임 시작 시 3초 피버', price: 40, icon: '🔥' },
  ],
};

export default function Home() {
  const [screen, setScreen] = useState('menu');
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [newUnlocks, setNewUnlocks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [canRevive, setCanRevive] = useState(true);

  // Shop state
  const [upgrades, setUpgrades] = useState({});
  const [consumables, setConsumables] = useState({});
  const [purchasedChars, setPurchasedChars] = useState([]);
  const [shopOptions, setShopOptions] = useState({});

  const gameCanvasRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('infiniteStairs_highScore');
    if (saved) setHighScore(parseInt(saved));
    const savedCoins = localStorage.getItem('infiniteStairs_totalCoins');
    if (savedCoins) setTotalCoins(parseInt(savedCoins));
    const savedChar = localStorage.getItem('infiniteStairs_selectedChar');
    if (savedChar) {
      const found = CHARACTERS.find(c => c.id === savedChar);
      if (found) setSelectedChar(found);
    }
    const savedUpgrades = localStorage.getItem('infiniteStairs_upgrades');
    if (savedUpgrades) setUpgrades(JSON.parse(savedUpgrades));
    const savedConsumables = localStorage.getItem('infiniteStairs_consumables');
    if (savedConsumables) setConsumables(JSON.parse(savedConsumables));
    const savedPurchased = localStorage.getItem('infiniteStairs_purchasedChars');
    if (savedPurchased) setPurchasedChars(JSON.parse(savedPurchased));
  }, []);

  const handleStartGame = useCallback(() => {
    soundManager.init();
    soundManager.playStartGame();

    // Build shop options from upgrades + consume consumables
    const options = { ...upgrades };
    const newConsumables = { ...consumables };

    if ((newConsumables.startShield || 0) > 0) {
      options.startShield = true;
      newConsumables.startShield--;
    }
    if ((newConsumables.feverStart || 0) > 0) {
      options.feverStart = true;
      newConsumables.feverStart--;
    }

    setConsumables(newConsumables);
    localStorage.setItem('infiniteStairs_consumables', JSON.stringify(newConsumables));
    setShopOptions(options);

    setGameKey(prev => prev + 1);
    setScreen('playing');
    setCanRevive(true);
  }, [upgrades, consumables]);

  const handleGameOver = useCallback((score, newHigh, unlocks, earned, total) => {
    setLastScore(score);
    setHighScore(newHigh);
    setIsNewRecord(score >= newHigh && score > 0);
    setNewUnlocks(unlocks || []);
    setEarnedCoins(earned);
    setTotalCoins(total);
    setScreen('result');
  }, []);

  const handleRevive = useCallback(() => {
    if (totalCoins >= 50 && gameCanvasRef.current) {
      const newTotal = totalCoins - 50;
      setTotalCoins(newTotal);
      localStorage.setItem('infiniteStairs_totalCoins', newTotal.toString());
      setCanRevive(false);
      gameCanvasRef.current.revive();
      setScreen('playing');
    }
  }, [totalCoins]);

  const handleCharSelect = useCallback(() => {
    setScreen('charSelect');
  }, []);

  const isCharUnlocked = useCallback((char) => {
    return highScore >= char.unlockScore || purchasedChars.includes(char.id);
  }, [highScore, purchasedChars]);

  const handleSelectCharacter = useCallback((char) => {
    if (isCharUnlocked(char)) {
      setSelectedChar(char);
      localStorage.setItem('infiniteStairs_selectedChar', char.id);
    }
  }, [isCharUnlocked]);

  const handleBackToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const toggleMute = useCallback(() => {
    soundManager.init();
    const isMuted = soundManager.toggleMute();
    setMuted(isMuted);
  }, []);

  // Shop handlers
  const handleBuyUpgrade = useCallback((item) => {
    if (totalCoins >= item.price && !upgrades[item.id]) {
      const newTotal = totalCoins - item.price;
      const newUpgrades = { ...upgrades, [item.id]: true };
      setTotalCoins(newTotal);
      setUpgrades(newUpgrades);
      localStorage.setItem('infiniteStairs_totalCoins', newTotal.toString());
      localStorage.setItem('infiniteStairs_upgrades', JSON.stringify(newUpgrades));
    }
  }, [totalCoins, upgrades]);

  const handleBuyConsumable = useCallback((item) => {
    if (totalCoins >= item.price) {
      const newTotal = totalCoins - item.price;
      const newConsumables = { ...consumables, [item.id]: (consumables[item.id] || 0) + 1 };
      setTotalCoins(newTotal);
      setConsumables(newConsumables);
      localStorage.setItem('infiniteStairs_totalCoins', newTotal.toString());
      localStorage.setItem('infiniteStairs_consumables', JSON.stringify(newConsumables));
    }
  }, [totalCoins, consumables]);

  const handleBuyCharacter = useCallback((char) => {
    const price = char.unlockScore * 2;
    if (totalCoins >= price && !purchasedChars.includes(char.id)) {
      const newTotal = totalCoins - price;
      const newPurchased = [...purchasedChars, char.id];
      setTotalCoins(newTotal);
      setPurchasedChars(newPurchased);
      localStorage.setItem('infiniteStairs_totalCoins', newTotal.toString());
      localStorage.setItem('infiniteStairs_purchasedChars', JSON.stringify(newPurchased));
    }
  }, [totalCoins, purchasedChars]);

  // Determine if we should show character bg image on the full page
  const showBgImage = (screen === 'playing' || screen === 'result') && selectedChar.theme?.bgImage;

  return (
    <div
      className="app-container"
      style={showBgImage ? {
        backgroundImage: `url(${selectedChar.theme.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* Background decorations */}
      {!showBgImage && <div className="bg-orb bg-orb-1" />}
      {!showBgImage && <div className="bg-orb bg-orb-2" />}

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
          v0.6.0
        </div>
      )}

      {/* Main Menu Screen */}
      <div className={`screen main-menu ${screen === 'menu' ? 'visible' : 'hidden'}`}>
        <div className="menu-card">
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

          <div className="menu-stats fade-in-up fade-in-up-3">
            {highScore > 0 && (
              <div className="high-score-badge">
                👑 최고 기록: {highScore}층
              </div>
            )}
            <div className="coin-badge">
              <Icon src="/icons8-coin-100.png" size={18} color="currentColor" /> 보유 코인: {totalCoins}개
            </div>
          </div>

          <div className="menu-buttons fade-in-up fade-in-up-4">
            <button className="btn-play" onClick={handleStartGame} id="btn-start">
              <div className="btn-content">
                <Icon src="/icons8-game-100.png" size={32} color="#FFFFFF" />
                <span>게임 시작</span>
              </div>
              <div className="btn-shine"></div>
            </button>
            <button className="btn-secondary" onClick={handleCharSelect} id="btn-chars">
              <Icon src="/icons8-character-100.png" size={24} color="currentColor" />
              <span>캐릭터 선택</span>
            </button>
            <button className="btn-secondary" onClick={() => setScreen('shop')} id="btn-shop">
              🏪 <span>상점</span>
            </button>
          </div>
        </div>
      </div>

      {/* Game Screen */}
      <div className={`screen game-screen ${(screen === 'playing' || screen === 'result') ? 'visible' : 'hidden'}`}
        style={{ pointerEvents: screen === 'playing' ? 'auto' : 'none' }}>
        {(screen === 'playing' || screen === 'result') && (
          <GameCanvas
            ref={gameCanvasRef}
            key={gameKey}
            character={selectedChar}
            onGameOver={handleGameOver}
            gameState="playing"
            shopOptions={shopOptions}
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
          <div className="result-stats">
            <div className="result-stat-item">
              <span>👑 최고 기록</span>
              <strong>{highScore}층</strong>
            </div>
            <div className="result-stat-item highlight">
              <Icon src="/icons8-coin-100.png" size={16} color="#FFD700" />
              <span>획득 코인</span>
              <strong>+{earnedCoins}</strong>
            </div>
            <div className="result-stat-item">
              <Icon src="/icons8-coin-100.png" size={14} color="rgba(255,255,255,0.7)" />
              <span>보유 코인</span>
              <strong>{totalCoins}</strong>
            </div>
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
          {canRevive && totalCoins >= 50 && (
            <button className="btn-play revive-btn" onClick={handleRevive} id="btn-revive">
              <div className="btn-content">
                <Icon src="/icons8-coin-100.png" size={28} color="#FFFFFF" />
                <span>50코인으로 부활</span>
              </div>
            </button>
          )}
          <button className="btn-play" onClick={handleStartGame} id="btn-retry">
            <div className="btn-content">
              <Icon src="/icons8-retry-60.png" size={28} color="#FFFFFF" />
              <span>다시 도전</span>
            </div>
          </button>
          <button className="btn-secondary" onClick={handleBackToMenu} id="btn-to-menu">
            <Icon src="/icons8-home-100.png" size={20} color="currentColor" />
            <span>메인 화면</span>
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
              isLocked={!isCharUnlocked(char)}
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

      {/* Shop Screen */}
      <div className={`screen shop-screen ${screen === 'shop' ? 'visible' : 'hidden'}`}>
        <h2 className="screen-title fade-in-up fade-in-up-1">🏪 상점</h2>

        <div className="shop-coins fade-in-up fade-in-up-1">
          <Icon src="/icons8-coin-100.png" size={20} color="#FFD700" />
          <span>{totalCoins} 코인</span>
        </div>

        <div className="shop-content fade-in-up fade-in-up-2">
          <div className="shop-section">
            <h3 className="shop-section-title">⚡ 영구 업그레이드</h3>
            {SHOP_ITEMS.upgrades.map(item => (
              <div key={item.id} className={`shop-item ${upgrades[item.id] ? 'owned' : ''}`}>
                <div className="shop-item-icon">{item.icon}</div>
                <div className="shop-item-info">
                  <div className="shop-item-name">{item.name}</div>
                  <div className="shop-item-desc">{item.desc}</div>
                </div>
                {upgrades[item.id] ? (
                  <div className="shop-item-owned">보유 중</div>
                ) : (
                  <button
                    className="shop-buy-btn"
                    disabled={totalCoins < item.price}
                    onClick={() => handleBuyUpgrade(item)}
                  >
                    <Icon src="/icons8-coin-100.png" size={14} color="#FFD700" />
                    {item.price}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="shop-section">
            <h3 className="shop-section-title">🎒 소모 아이템</h3>
            {SHOP_ITEMS.consumables.map(item => (
              <div key={item.id} className="shop-item">
                <div className="shop-item-icon">{item.icon}</div>
                <div className="shop-item-info">
                  <div className="shop-item-name">
                    {item.name}
                    {(consumables[item.id] || 0) > 0 && (
                      <span className="shop-item-count"> ×{consumables[item.id]}</span>
                    )}
                  </div>
                  <div className="shop-item-desc">{item.desc}</div>
                </div>
                <button
                  className="shop-buy-btn"
                  disabled={totalCoins < item.price}
                  onClick={() => handleBuyConsumable(item)}
                >
                  <Icon src="/icons8-coin-100.png" size={14} color="#FFD700" />
                  {item.price}
                </button>
              </div>
            ))}
          </div>

          <div className="shop-section">
            <h3 className="shop-section-title">🎭 캐릭터 해금</h3>
            {CHARACTERS.filter(c => c.unlockScore > 0).map(char => {
              const unlocked = isCharUnlocked(char);
              const price = char.unlockScore * 2;
              return (
                <div key={char.id} className={`shop-item ${unlocked ? 'owned' : ''}`}>
                  <ShopCharIcon character={char} />
                  <div className="shop-item-info">
                    <div className="shop-item-name">{char.name}</div>
                    <div className="shop-item-desc">
                      {unlocked ? '해금됨' : `${char.unlockScore}점 달성 또는 코인 구매`}
                    </div>
                  </div>
                  {unlocked ? (
                    <div className="shop-item-owned">해금됨</div>
                  ) : (
                    <button
                      className="shop-buy-btn"
                      disabled={totalCoins < price}
                      onClick={() => handleBuyCharacter(char)}
                    >
                      <Icon src="/icons8-coin-100.png" size={14} color="#FFD700" />
                      {price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="char-select-footer fade-in-up fade-in-up-3">
          <button className="btn-secondary" onClick={handleBackToMenu} id="btn-shop-back">
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Icon component for coloring images
const Icon = ({ src, size = 24, color = 'currentColor', style }) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      WebkitMask: `url(${src}) no-repeat center / contain`,
      mask: `url(${src}) no-repeat center / contain`,
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style
    }}
  />
);

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

// Small character icon for shop
function ShopCharIcon({ character }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 36, 36);
    drawCharacter(ctx, 18, 24, character, 1, 0, 0.7);
  }, [character]);

  return (
    <div className="shop-item-icon">
      <canvas ref={canvasRef} width={36} height={36} style={{ display: 'block' }} />
    </div>
  );
}

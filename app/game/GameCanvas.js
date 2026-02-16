'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from './GameEngine';
import { CHARACTERS } from './Characters';

export default function GameCanvas({
    character,
    onGameOver,
    gameState,
    onGameStart
}) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const animFrameRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 400, height: 700 });
    const [autoDir, setAutoDir] = useState(false);

    // Calculate canvas size for both portrait and landscape
    useEffect(() => {
        const updateSize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isLandscape = vw > vh;

            let w, h;
            if (isLandscape) {
                // Landscape: use full height, limit width to aspect ratio
                h = vh;
                w = Math.min(vw * 0.6, h * 0.65);
            } else {
                // Portrait: same as before
                w = Math.min(vw, 420);
                h = Math.min(vh - 20, 800);
            }
            setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Resize canvas without recreating engine
    useEffect(() => {
        const canvas = canvasRef.current;
        const engine = engineRef.current;
        if (!canvas || !engine) return;
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        engine.width = canvasSize.width;
        engine.height = canvasSize.height;
    }, [canvasSize]);

    // Create engine once and start game immediately
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        const engine = new GameEngine(canvas, character || CHARACTERS[0]);
        engine.onGameOver(onGameOver);
        engineRef.current = engine;

        // Start the game right away
        engine.startGame();

        const gameLoop = () => {
            engine.update();
            engine.render();
            animFrameRef.current = requestAnimationFrame(gameLoop);
        };

        animFrameRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            engine.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleAutoDirection = useCallback(() => {
        if (engineRef.current) {
            const next = !engineRef.current.autoDirection;
            engineRef.current.autoDirection = next;
            setAutoDir(next);
        }
    }, []);

    const handleStep = useCallback(() => {
        if (engineRef.current && engineRef.current.state === 'playing') {
            engineRef.current.handleStep();
        }
    }, []);

    const handleDirectionChange = useCallback(() => {
        if (engineRef.current && engineRef.current.state === 'playing') {
            engineRef.current.handleDirectionChange();
        }
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;

            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
                e.preventDefault();
                handleStep();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                handleDirectionChange();
            }
            // Secret toggle: backtick key
            if (e.key === '`') {
                toggleAutoDirection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleStep, handleDirectionChange, toggleAutoDirection]);

    return (
        <div className="game-canvas-wrapper">
            {/* Secret auto-direction toggle — completely invisible */}
            {gameState === 'playing' && (
                <button
                    onClick={toggleAutoDirection}
                    id="btn-auto-dir"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 200,
                        width: 30,
                        height: 30,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'default',
                        padding: 0,
                        outline: 'none',
                    }}
                    aria-hidden="true"
                />
            )}

            <canvas
                ref={canvasRef}
                className="game-canvas"
                style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                }}
            />

            {gameState === 'playing' && (
                <div className="game-controls-overlay">
                    <div className="controls-left">
                        <button
                            className="control-btn direction-btn"
                            onPointerDown={(e) => {
                                e.preventDefault();
                                handleDirectionChange();
                            }}
                            id="btn-direction"
                        >
                            <span className="btn-icon">⇄</span>
                            <span className="btn-label">방향 전환</span>
                        </button>
                    </div>
                    <div className="controls-right">
                        <button
                            className="control-btn step-btn"
                            onPointerDown={(e) => {
                                e.preventDefault();
                                handleStep();
                            }}
                            id="btn-step"
                        >
                            <span className="btn-icon">⬆</span>
                            <span className="btn-label">점프</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

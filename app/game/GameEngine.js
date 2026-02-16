import { drawCharacter, CHARACTERS } from './Characters';
import { soundManager } from './SoundManager';

export class GameEngine {
    constructor(canvas, character) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Game state
        this.state = 'ready'; // ready, playing, falling, gameover
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('infiniteStairs_highScore') || '0');
        this.character = character || CHARACTERS[0];
        this.frame = 0;
        this.gameOverCallback = null;

        // Energy system
        this.energy = 100;
        this.maxEnergy = 100;
        this.energyDecayRate = 0.15; // per frame, increases with difficulty
        this.energyRecoverAmount = 8; // per step

        // Stairs
        this.stairs = [];
        this.currentStairIndex = 0;
        this.stairWidth = 55;
        this.stairHeight = 18;
        this.stairGap = 0; // horizontal gap between stairs

        // Player
        this.playerX = 0;
        this.playerY = 0;
        this.playerDirection = 1; // 1 = right, -1 = left
        this.targetX = 0;
        this.targetY = 0;
        this.isMoving = false;
        this.moveProgress = 0;
        this.moveSpeed = 0.12;
        this.baseMoveSpeed = 0.12;
        this.maxMoveSpeed = 0.45;
        this.speedMomentum = 0; // 0~1, builds with fast input, decays over time

        // Input queue for fast key presses
        this.inputQueue = []; // 'step' or 'direction'
        this.maxQueueSize = 3;
        this.lastInputTime = 0;

        // Test mode: auto direction (just press space to climb)
        this.autoDirection = false;

        // Falling state
        this.fallVelocityX = 0;
        this.fallVelocityY = 0;
        this.fallStartY = 0;

        // Camera
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.cameraSmoothing = 0.08;

        // Visual effects
        this.particles = [];
        this.bgHue = 220;
        this.targetBgHue = 220;
        this.milestoneFlash = 0;
        this.screenShake = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.floatingTexts = [];

        // Background color themes per 100 floors
        this.bgThemes = [
            { h: 220, s: 30, l: 15 },  // Deep blue
            { h: 280, s: 35, l: 12 },  // Purple night  
            { h: 160, s: 30, l: 12 },  // Deep ocean
            { h: 340, s: 35, l: 12 },  // Dark rose
            { h: 30, s: 40, l: 12 },   // Warm brown
            { h: 200, s: 40, l: 10 },  // Midnight blue
            { h: 120, s: 25, l: 12 },  // Forest
            { h: 0, s: 35, l: 12 },    // Deep red
            { h: 45, s: 45, l: 12 },   // Golden
            { h: 260, s: 40, l: 10 },  // Royal purple
        ];

        // Stars for background
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 3,
                size: Math.random() * 2 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01
            });
        }

        this.generateInitialStairs();
        this.positionPlayerOnStair(0);
    }

    generateInitialStairs() {
        this.stairs = [];
        let x = this.width / 2;
        let y = this.height - 100;
        let dir = 1; // 1 = right, -1 = left

        for (let i = 0; i < 200; i++) {
            this.stairs.push({
                x: x,
                y: y,
                direction: dir,
                width: this.stairWidth,
                visited: i === 0,
            });

            // Next stair direction
            if (Math.random() < 0.4) {
                dir = -dir;
            }

            x += dir * (this.stairWidth * 0.7);
            y -= this.stairHeight + 20;

            // Boundary checks
            if (x < 80) { dir = 1; x = 80; }
            if (x > this.width - 80) { dir = -1; x = this.width - 80; }
        }
    }

    positionPlayerOnStair(index) {
        const stair = this.stairs[index];
        this.playerX = stair.x;
        this.playerY = stair.y - 16;
        this.currentStairIndex = index;
    }

    generateMoreStairs() {
        const lastStair = this.stairs[this.stairs.length - 1];
        let x = lastStair.x;
        let y = lastStair.y;
        let dir = lastStair.direction;

        for (let i = 0; i < 50; i++) {
            if (Math.random() < 0.4) {
                dir = -dir;
            }
            x += dir * (this.stairWidth * 0.7);
            y -= this.stairHeight + 20;

            if (x < 80) { dir = 1; x = 80; }
            if (x > this.width - 80) { dir = -1; x = this.width - 80; }

            this.stairs.push({
                x: x,
                y: y,
                direction: dir,
                width: this.stairWidth,
                visited: false,
            });
        }
    }

    handleStep() {
        if (this.state !== 'playing') return;

        // Build speed momentum from input interval
        const now = performance.now();
        const interval = now - this.lastInputTime;
        this.lastInputTime = now;

        // Fast input adds momentum (interval <400ms = fast)
        if (interval < 500) {
            // Shorter interval -> bigger momentum boost, with diminishing returns
            const boost = Math.pow(Math.max(0, 500 - interval) / 500, 1.5) * 0.35;
            this.speedMomentum = Math.min(1, this.speedMomentum + boost);
        }

        // Apply momentum to move speed with easing
        const eased = this.speedMomentum * this.speedMomentum; // ease-in curve
        this.moveSpeed = this.baseMoveSpeed + (this.maxMoveSpeed - this.baseMoveSpeed) * eased;

        // If currently moving, queue the input
        if (this.isMoving) {
            if (this.inputQueue.length < this.maxQueueSize) {
                this.inputQueue.push('step');
            }
            return;
        }

        const currentStair = this.stairs[this.currentStairIndex];
        const nextIndex = this.currentStairIndex + 1;

        if (nextIndex >= this.stairs.length) {
            this.generateMoreStairs();
        }

        const nextStair = this.stairs[nextIndex];

        // Check: the next stair's position relative to current
        const dx = nextStair.x - currentStair.x;
        const expectedDir = dx > 0 ? 1 : dx < 0 ? -1 : this.playerDirection;

        // Auto-direction test mode: automatically face the right way
        if (this.autoDirection) {
            this.playerDirection = expectedDir;
        }

        if (this.playerDirection !== expectedDir) {
            // Wrong direction - jump into the void and fall!
            this.startFalling();
            return;
        }

        // Correct step!
        this.isMoving = true;
        this.moveProgress = 0;
        this.targetX = nextStair.x;
        this.targetY = nextStair.y - 16;

        const startX = this.playerX;
        const startY = this.playerY;

        this.moveStartX = startX;
        this.moveStartY = startY;

        nextStair.visited = true;
        this.currentStairIndex = nextIndex;
        this.score++;

        // Energy recovery
        this.energy = Math.min(this.maxEnergy, this.energy + this.energyRecoverAmount);

        // Combo system
        this.combo++;
        this.comboTimer = 60;

        // Sound
        soundManager.playStep(this.score);

        // Score text
        if (this.combo > 3) {
            this.addFloatingText(`${this.combo} combo!`, this.playerX, this.playerY - 30, '#FFD700');
        }

        // Step particles
        this.addStepParticles(startX, startY + 16);

        // Milestone check (every 100 floors)
        if (this.score > 0 && this.score % 100 === 0) {
            this.milestoneFlash = 60;
            soundManager.playMilestone();
            this.addFloatingText(`🎉 ${this.score}층 돌파!`, this.width / 2, this.height / 2, '#FFD700', 2);

            // Milestone particles explosion
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: this.width / 2,
                    y: this.height / 2,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    life: 60 + Math.random() * 40,
                    maxLife: 100,
                    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
                    size: Math.random() * 5 + 2,
                });
            }
        }

        // Update difficulty
        this.updateDifficulty();

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('infiniteStairs_highScore', this.highScore.toString());
        }
    }

    handleDirectionChange() {
        if (this.state !== 'playing') return;

        // If currently moving, queue the direction change
        if (this.isMoving) {
            if (this.inputQueue.length < this.maxQueueSize) {
                this.inputQueue.push('direction');
            }
            return;
        }
        this.playerDirection *= -1;
        soundManager.playDirectionChange();

        // Direction change particle
        this.addStepParticles(this.playerX, this.playerY + 16, 3);
    }

    updateDifficulty() {
        // Increase energy decay rate over time
        this.energyDecayRate = 0.15 + (this.score * 0.001);
        // Cap at reasonable maximum
        this.energyDecayRate = Math.min(this.energyDecayRate, 0.6);

        // Decrease energy recovery slightly
        this.energyRecoverAmount = Math.max(3, 8 - this.score * 0.005);
    }

    startFalling() {
        this.state = 'falling';
        // Jump in the wrong direction (where there's no stair)
        this.fallVelocityX = this.playerDirection * 3;
        this.fallVelocityY = -8; // initial upward jump
        this.fallStartY = this.playerY;
        soundManager.playGameOver();
    }

    triggerGameOver() {
        this.state = 'gameover';
        this.screenShake = 20;
        soundManager.playGameOver();

        // Death particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.playerX,
                y: this.playerY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 1) * 6,
                life: 40 + Math.random() * 30,
                maxLife: 70,
                color: this.character.colors.body,
                size: Math.random() * 4 + 2,
            });
        }

        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('infiniteStairs_highScore', this.highScore.toString());
        }

        // Check for new character unlocks
        const newUnlocks = CHARACTERS.filter(c => {
            const prevHigh = parseInt(localStorage.getItem('infiniteStairs_prevHighScore') || '0');
            return c.unlockScore > prevHigh && c.unlockScore <= this.highScore;
        });

        localStorage.setItem('infiniteStairs_prevHighScore', this.highScore.toString());

        setTimeout(() => {
            if (this.gameOverCallback) {
                this.gameOverCallback(this.score, this.highScore, newUnlocks);
            }
        }, 1200);
    }

    addStepParticles(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                color: `hsl(${40 + Math.random() * 20}, 70%, 70%)`,
                size: Math.random() * 3 + 1,
            });
        }
    }

    addFloatingText(text, x, y, color = '#FFF', scale = 1) {
        this.floatingTexts.push({
            text, x, y, color, scale,
            life: 80,
            maxLife: 80,
            vy: -1.5,
        });
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.energy = this.maxEnergy;
        this.energyDecayRate = 0.15;
        this.energyRecoverAmount = 8;
        this.combo = 0;
        this.comboTimer = 0;
        this.particles = [];
        this.floatingTexts = [];
        this.frame = 0;
        this.playerDirection = 1;
        this.isMoving = false;
        this.moveSpeed = this.baseMoveSpeed;
        this.speedMomentum = 0;
        this.inputQueue = [];
        this.lastInputTime = 0;
        this.screenShake = 0;
        this.milestoneFlash = 0;

        this.generateInitialStairs();
        this.positionPlayerOnStair(0);
        this.cameraY = 0;
        this.targetCameraY = 0;

        soundManager.init();
        soundManager.playStartGame();
    }

    update() {
        this.frame++;

        // Handle falling state
        if (this.state === 'falling') {
            this.fallVelocityY += 0.5; // gravity
            this.playerX += this.fallVelocityX;
            this.playerY += this.fallVelocityY;

            // Camera still follows loosely
            this.targetCameraY = this.playerY - this.height * 0.55;
            this.cameraY += (this.targetCameraY - this.cameraY) * 0.04;

            // Spawn trail particles while falling
            if (this.frame % 3 === 0) {
                this.particles.push({
                    x: this.playerX + (Math.random() - 0.5) * 10,
                    y: this.playerY,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 2,
                    life: 15,
                    maxLife: 15,
                    color: this.character.colors.body,
                    size: Math.random() * 3 + 1,
                });
            }

            this.updateParticles();
            this.updateFloatingTexts();

            // Screen shake during fall
            this.screenShake = 5;

            // Once fallen far enough below the last stair, trigger game over
            if (this.playerY > this.fallStartY + 200) {
                this.triggerGameOver();
            }
            return;
        }

        if (this.state !== 'playing') return;

        // Energy decay
        this.energy -= this.energyDecayRate;
        if (this.energy <= 0) {
            this.energy = 0;
            this.triggerGameOver();
            return;
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Decay speed momentum smoothly
        if (this.speedMomentum > 0) {
            this.speedMomentum *= 0.97; // gradual decay
            if (this.speedMomentum < 0.01) this.speedMomentum = 0;
            const eased = this.speedMomentum * this.speedMomentum;
            this.moveSpeed = this.baseMoveSpeed + (this.maxMoveSpeed - this.baseMoveSpeed) * eased;
        }

        // Move animation
        if (this.isMoving) {
            this.moveProgress += this.moveSpeed;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.playerX = this.targetX;
                this.playerY = this.targetY;

                // Process queued inputs
                this.processInputQueue();
            } else {
                // Smooth easing with a jump arc
                const t = this.moveProgress;
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this.playerX = this.moveStartX + (this.targetX - this.moveStartX) * ease;
                const jumpHeight = Math.sin(t * Math.PI) * 25;
                this.playerY = this.moveStartY + (this.targetY - this.moveStartY) * ease - jumpHeight;
            }
        }

        // Camera tracking — speed up when moving fast
        this.targetCameraY = this.playerY - this.height * 0.55;
        const cameraSpeed = this.moveSpeed > this.baseMoveSpeed
            ? this.cameraSmoothing + (this.moveSpeed - this.baseMoveSpeed) * 0.4
            : this.cameraSmoothing;
        this.cameraY += (this.targetCameraY - this.cameraY) * cameraSpeed;

        // Generate more stairs if needed
        const topVisibleY = this.cameraY;
        const lastStair = this.stairs[this.stairs.length - 1];
        if (lastStair && lastStair.y > topVisibleY - 200) {
            this.generateMoreStairs();
        }

        // Update particles
        this.updateParticles();

        // Update floating texts
        this.updateFloatingTexts();

        // Background color transition
        const themeIndex = Math.floor(this.score / 100) % this.bgThemes.length;
        const theme = this.bgThemes[themeIndex];
        this.targetBgHue = theme.h;
        this.bgHue += (this.targetBgHue - this.bgHue) * 0.02;

        // Screen shake decay
        if (this.screenShake > 0) this.screenShake *= 0.9;

        // Milestone flash decay
        if (this.milestoneFlash > 0) this.milestoneFlash--;
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life--;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    processInputQueue() {
        if (this.inputQueue.length === 0) return;
        const next = this.inputQueue.shift();
        if (next === 'step') {
            this.handleStep();
        } else if (next === 'direction') {
            this.playerDirection *= -1;
            soundManager.playDirectionChange();
            this.addStepParticles(this.playerX, this.playerY + 16, 3);
            // After direction change, process next in queue
            this.processInputQueue();
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.save();

        // Screen shake
        if (this.screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
            );
        }

        // Background
        const themeIndex = Math.floor(this.score / 100) % this.bgThemes.length;
        const theme = this.bgThemes[themeIndex];
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `hsl(${theme.h}, ${theme.s}%, ${theme.l}%)`);
        gradient.addColorStop(1, `hsl(${theme.h + 20}, ${theme.s + 10}%, ${theme.l + 5}%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Stars
        this.stars.forEach(star => {
            star.twinkle += star.speed;
            const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
            const starScreenY = ((star.y - this.cameraY * 0.3) % (h * 2));
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, starScreenY, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Milestone flash
        if (this.milestoneFlash > 0) {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.milestoneFlash / 120})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Camera transform
        ctx.save();
        ctx.translate(0, -this.cameraY);

        // Render stairs
        this.renderStairs(ctx);

        // Render player
        drawCharacter(
            ctx,
            this.playerX,
            this.playerY,
            this.character,
            this.playerDirection,
            this.frame,
            1.1
        );

        // Render particles (in world space)
        this.renderParticles(ctx);

        ctx.restore();

        // HUD (screen space)
        if (this.state === 'playing' || this.state === 'falling') {
            this.renderHUD(ctx);
        }

        // Floating texts (screen space)
        this.renderFloatingTexts(ctx);

        ctx.restore();
    }

    renderStairs(ctx) {
        const visibleTop = this.cameraY - 50;
        const visibleBottom = this.cameraY + this.height + 50;

        for (let i = 0; i < this.stairs.length; i++) {
            const stair = this.stairs[i];
            if (stair.y < visibleTop || stair.y > visibleBottom) continue;

            const sw = stair.width;
            const sh = this.stairHeight;
            const sx = stair.x - sw / 2;
            const sy = stair.y;

            // Stair shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(sx + 3, sy + 3, sw, sh);

            // Stair body
            if (stair.visited) {
                const themeIdx = Math.floor(this.score / 100) % this.bgThemes.length;
                const hue = this.bgThemes[themeIdx].h;
                ctx.fillStyle = `hsl(${(hue + 120) % 360}, 50%, 55%)`;
            } else if (i === this.currentStairIndex + 1) {
                // Next stair highlight (subtle glow)
                ctx.fillStyle = '#AABBCC';
            } else {
                ctx.fillStyle = '#8899AA';
            }

            // Rounded stair
            ctx.beginPath();
            ctx.roundRect(sx, sy, sw, sh, 4);
            ctx.fill();

            // Stair highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(sx + 2, sy + 1, sw - 4, sh / 3);

            // Stair outline
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(sx, sy, sw, sh, 4);
            ctx.stroke();

            // Floor number every 10 stairs
            if (i > 0 && i % 10 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '10px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${i}`, stair.x, sy + sh - 3);
            }
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    renderFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            const alpha = ft.life / ft.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${16 * ft.scale}px "Outfit", sans-serif`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1;
    }

    renderHUD(ctx) {
        const w = this.width;
        const padding = 15;

        // Score display
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(padding, padding, 100, 45, 12);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('점수', padding + 12, padding + 16);
        ctx.font = 'bold 22px "Outfit", sans-serif';
        ctx.fillText(this.score.toString(), padding + 12, padding + 38);

        // Energy bar
        const barWidth = w - 2 * padding;
        const barHeight = 12;
        const barY = this.height - padding - barHeight;

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(padding, barY - 2, barWidth, barHeight + 4, 8);
        ctx.fill();

        // Energy level
        const energyRatio = this.energy / this.maxEnergy;
        let barColor;
        if (energyRatio > 0.5) {
            barColor = `hsl(${120 * energyRatio + 20}, 80%, 55%)`;
        } else if (energyRatio > 0.25) {
            barColor = '#FFB800';
        } else {
            barColor = '#FF4444';
            // Low energy pulse
            if (Math.floor(this.frame / 8) % 2 === 0) {
                barColor = '#FF6666';
            }
        }

        const gradient = ctx.createLinearGradient(padding, barY, padding, barY + barHeight);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, barColor.replace('55%', '40%'));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(padding + 2, barY, (barWidth - 4) * energyRatio, barHeight, 6);
        ctx.fill();

        // Energy shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(padding + 2, barY, (barWidth - 4) * energyRatio, barHeight / 2, 6);
        ctx.fill();

        // Energy label
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 9px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 에너지', w / 2, barY - 6);

        // Combo display
        if (this.combo > 2) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(w - padding - 80, padding, 80, 35, 12);
            ctx.fill();

            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 x${this.combo}`, w - padding - 40, padding + 23);
        }

        // Direction indicator
        const arrowX = w / 2;
        const arrowY = padding + 20;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(arrowX - 30, padding, 60, 30, 10);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = '18px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.playerDirection > 0 ? '→' : '←', arrowX, arrowY + 5);

        // Speed indicator
        const speedRatio = (this.moveSpeed - this.baseMoveSpeed) / (this.maxMoveSpeed - this.baseMoveSpeed);
        const speedPercent = Math.round(speedRatio * 100);
        const speedBoxW = 110;
        const speedBoxH = 45;
        const speedBoxX = w - padding - speedBoxW;
        const speedBoxY = padding + 45;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(speedBoxX, speedBoxY, speedBoxW, speedBoxH, 12);
        ctx.fill();

        // Speed bar background
        const sBarX = speedBoxX + 8;
        const sBarY = speedBoxY + 30;
        const sBarW = speedBoxW - 16;
        const sBarH = 8;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(sBarX, sBarY, sBarW, sBarH, 4);
        ctx.fill();

        // Speed bar fill
        const speedColor = speedRatio > 0.7 ? '#FF4444' : speedRatio > 0.3 ? '#FFB800' : '#44BBFF';
        ctx.fillStyle = speedColor;
        ctx.beginPath();
        ctx.roundRect(sBarX, sBarY, sBarW * Math.max(0.05, speedRatio), sBarH, 4);
        ctx.fill();

        // Speed text
        ctx.fillStyle = speedColor;
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`⚡ 속도 ${speedPercent}%`, speedBoxX + 8, speedBoxY + 18);
    }

    setCharacter(character) {
        this.character = character;
    }

    onGameOver(callback) {
        this.gameOverCallback = callback;
    }

    destroy() {
        // Cleanup
    }
}

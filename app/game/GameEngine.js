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
        this.totalCoins = parseInt(localStorage.getItem('infiniteStairs_totalCoins') || '0');
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

        // Set initial theme based on character
        const theme = this.character.theme || {
            bg: { h: 220, s: 30, l: 15 },
            stair: '#7B8FA0',
            stairNext: '#9AB0C4',
            stairVisited: '#5A90D0',
        };
        this.bgHue = theme.bg.h;
        this.targetBgHue = theme.bg.h;

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

        // Items
        this.items = [];
        this.activeShield = false;
        this.feverTimer = 0;
        this.isRocketing = false;
        this.rocketStepsRemaining = 0;
        this.itemTypes = [
            { id: 'shield', label: '🛡️', color: '#44BBFF', chance: 0.04 },
            { id: 'fever', label: '🔥', color: '#FF4444', chance: 0.03 },
            { id: 'rocket', label: '🚀', color: '#FF8800', chance: 0.02 }
        ];

        this.isShielding = false;
        this.shieldAnimProgress = 0;
        this.itemSpawnCooldown = 0;

        // Fire effect
        this.fireParticles = [];
        this.fireIntensity = 0;

        this.generateInitialStairs();
        this.positionPlayerOnStair(0);
    }

    generateInitialStairs() {
        this.stairs = [];
        let x = this.width / 2;
        let y = this.height - 100;
        let dir = 1; // 1 = right, -1 = left

        for (let i = 0; i < 200; i++) {
            const stair = {
                x: x,
                y: y,
                direction: dir,
                width: this.stairWidth,
                visited: i === 0,
                item: null
            };

            // Spawn item (don't spawn on first few stairs or during cooldown)
            if (i > 10 && this.itemSpawnCooldown <= 0 && Math.random() < 0.15) {
                const rand = Math.random();
                let cumulative = 0;
                for (const type of this.itemTypes) {
                    cumulative += type.chance * 2;
                    if (rand < cumulative) {
                        stair.item = { ...type };
                        if (type.id === 'rocket') {
                            this.itemSpawnCooldown = 20;
                        }
                        break;
                    }
                }
            }

            if (this.itemSpawnCooldown > 0) this.itemSpawnCooldown--;

            this.stairs.push(stair);

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

            const stair = {
                x: x,
                y: y,
                direction: dir,
                width: this.stairWidth,
                visited: false,
                item: null
            };

            // Spawn item (only if not rocketing or in fever)
            if (this.itemSpawnCooldown <= 0 && !this.isRocketing && this.feverTimer <= 0 && Math.random() < 0.1) {
                const rand = Math.random();
                let cumulative = 0;
                const totalChance = this.itemTypes.reduce((sum, t) => sum + t.chance, 0);
                const normalizedRand = rand * totalChance;

                for (const type of this.itemTypes) {
                    cumulative += type.chance;
                    if (normalizedRand < cumulative) {
                        stair.item = { ...type };
                        if (type.id === 'rocket') {
                            this.itemSpawnCooldown = 20;
                        }
                        break;
                    }
                }
            }

            if (this.itemSpawnCooldown > 0) this.itemSpawnCooldown--;
            this.stairs.push(stair);
        }
    }

    handleStep(isInternal = false) {
        if (this.state !== 'playing') return;
        if (this.isRocketing && !isInternal) return;

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

        // Fever mode, Rocket mode or Auto-direction test mode: automatically face the right way
        if (this.feverTimer > 0 || this.isRocketing || this.autoDirection) {
            this.playerDirection = expectedDir;
        }

        if (this.playerDirection !== expectedDir) {
            if (this.activeShield) {
                this.activeShield = false;
                this.isShielding = true;
                this.shieldAnimProgress = 0;
                this.moveStartX = this.playerX;
                this.moveStartY = this.playerY;
                // Target is the current stair (returning to safety)
                this.targetX = currentStair.x;
                this.targetY = currentStair.y - 16;
                this.addFloatingText('SHIELD SAVED!', this.playerX, this.playerY - 50, '#44BBFF', 1.2);
                soundManager.playDirectionChange(); // Sound feedback
                return;
            } else {
                // Wrong direction - jump into the void and fall!
                this.startFalling();
                return;
            }
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

        // Item Pickup
        if (nextStair.item) {
            this.handleItemPickup(nextStair.item);
            nextStair.item = null;
        }

        this.currentStairIndex = nextIndex;
        this.score += this.feverTimer > 0 ? 2 : 1;

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

    handleItemPickup(item) {
        soundManager.playItemPickup();
        this.addFloatingText(`${item.label} GET!`, this.playerX, this.playerY - 40, item.color, 1.2);

        switch (item.id) {
            case 'energy':
                this.energy = Math.min(this.maxEnergy, this.energy + 30);
                break;
            case 'coin':
                this.score += 10;
                this.addFloatingText('+10', this.playerX + 20, this.playerY - 20, '#FFD700');
                break;
            case 'shield':
                this.activeShield = true;
                break;
            case 'fever':
                this.feverTimer = 300; // 5 seconds at 60fps
                this.screenShake = 10;
                this.clearUpcomingItems(60);
                break;
            case 'rocket':
                this.startRocket();
                break;
        }
    }

    startRocket() {
        this.isRocketing = true;
        this.rocketStepsRemaining = 20;
        this.clearUpcomingItems(25);
        this.addFloatingText('🚀 ROCKET JUMP!', this.width / 2, this.height / 2, '#FF8800', 1.5);
    }

    clearUpcomingItems(count) {
        const start = this.currentStairIndex + 1;
        const end = Math.min(this.stairs.length, start + count);
        for (let i = start; i < end; i++) {
            this.stairs[i].item = null;
        }
    }

    handleDirectionChange() {
        if (this.state !== 'playing' || this.isRocketing) return;

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

        // Move one step up after changing direction
        this.handleStep();
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
        this.screenShake = 8;
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

        // Update total coins
        const earnedCoins = this.score;
        this.totalCoins += earnedCoins;
        localStorage.setItem('infiniteStairs_totalCoins', this.totalCoins.toString());

        setTimeout(() => {
            if (this.gameOverCallback) {
                this.gameOverCallback(this.score, this.highScore, newUnlocks, earnedCoins, this.totalCoins);
            }
        }, 1200);
    }

    revive() {
        this.state = 'playing';
        this.energy = this.maxEnergy;
        this.isMoving = false;
        this.isShielding = false;
        this.isRocketing = false;
        this.feverTimer = 0;

        // Position on current stair
        this.positionPlayerOnStair(this.currentStairIndex);

        // Face the correct way
        const currentStair = this.stairs[this.currentStairIndex];
        const nextStair = this.stairs[this.currentStairIndex + 1];
        if (nextStair) {
            const dx = nextStair.x - currentStair.x;
            this.playerDirection = dx > 0 ? 1 : -1;
        }

        this.addFloatingText('REVIVED!', this.playerX, this.playerY - 40, '#FFD700', 1.5);
        soundManager.playStartGame();
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

        // Reset item states
        this.activeShield = false;
        this.feverTimer = 0;
        this.isRocketing = false;
        this.rocketStepsRemaining = 0;

        // Clear fire
        this.fireParticles = [];
        this.fireIntensity = 0;

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

            // Spawn fire particles from bottom of screen
            this.fireIntensity = Math.min(1, this.fireIntensity + 0.03);
            const spawnCount = Math.floor(3 + this.fireIntensity * 5);
            for (let i = 0; i < spawnCount; i++) {
                this.fireParticles.push({
                    x: Math.random() * this.width,
                    y: this.height + Math.random() * 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -(2 + Math.random() * 4 + this.fireIntensity * 3),
                    life: 30 + Math.random() * 30,
                    maxLife: 60,
                    size: 8 + Math.random() * 15,
                    hue: Math.random() * 40, // 0=red, 40=yellow
                });
            }

            // Update fire particles
            for (let i = this.fireParticles.length - 1; i >= 0; i--) {
                const p = this.fireParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx += (Math.random() - 0.5) * 0.5;
                p.size *= 0.97;
                p.life--;
                if (p.life <= 0 || p.size < 1) {
                    this.fireParticles.splice(i, 1);
                }
            }

            this.updateParticles();
            this.updateFloatingTexts();

            // Brief screen shake at start of fall only
            if (this.screenShake < 2) this.screenShake = 2;

            // Once fallen far enough below the last stair, trigger game over
            if (this.playerY > this.fallStartY + 200) {
                this.triggerGameOver();
            }
            return;
        }

        // Keep fire alive during gameover
        if (this.state === 'gameover' && this.fireParticles.length > 0) {
            // Continue spawning fire
            for (let i = 0; i < 4; i++) {
                this.fireParticles.push({
                    x: Math.random() * this.width,
                    y: this.height + Math.random() * 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -(2 + Math.random() * 5),
                    life: 30 + Math.random() * 30,
                    maxLife: 60,
                    size: 8 + Math.random() * 15,
                    hue: Math.random() * 40,
                });
            }
            // Update existing fire
            for (let i = this.fireParticles.length - 1; i >= 0; i--) {
                const p = this.fireParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx += (Math.random() - 0.5) * 0.5;
                p.size *= 0.97;
                p.life--;
                if (p.life <= 0 || p.size < 1) {
                    this.fireParticles.splice(i, 1);
                }
            }
            return;
        }

        if (this.state !== 'playing') return;

        // Fever mode handling
        if (this.feverTimer > 0) {
            this.feverTimer--;
            this.energy = Math.min(this.maxEnergy, this.energy + 0.2); // slight energy recovery during fever
            if (this.frame % 5 === 0) {
                this.addStepParticles(this.playerX, this.playerY + 16, 2);
            }
        }

        // Rocket handling
        if (this.isRocketing) {
            if (this.frame % 3 === 0) {
                this.handleStep(true);
                this.rocketStepsRemaining--;
                if (this.rocketStepsRemaining <= 0) {
                    this.isRocketing = false;
                }
            }
        }

        // Energy decay (only if not rocketing)
        if (!this.isRocketing) {
            this.energy -= this.feverTimer > 0 ? this.energyDecayRate * 0.2 : this.energyDecayRate;
        }

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

        // Shield recovery animation handling
        if (this.isShielding) {
            this.shieldAnimProgress += 0.04;
            if (this.shieldAnimProgress >= 1) {
                this.shieldAnimProgress = 1;
                this.isShielding = false;
                this.playerX = this.targetX;
                this.playerY = this.targetY;
            } else {
                const t = this.shieldAnimProgress;
                if (t < 0.4) {
                    // Stage 1: Jump into void (wrong direction)
                    const subT = t / 0.4;
                    const jumpDist = 40 * subT;
                    this.playerX = this.moveStartX + (this.playerDirection * jumpDist);
                    this.playerY = this.moveStartY + Math.sin(subT * Math.PI) * -30 + (subT * subT * 40);
                } else {
                    // Stage 2: Pull back to safety
                    const subT = (t - 0.4) / 0.6;
                    const easeOut = 1 - Math.pow(1 - subT, 3);
                    const currentWrongX = this.moveStartX + (this.playerDirection * 40);
                    const currentDeepY = this.moveStartY + 40;
                    this.playerX = currentWrongX + (this.targetX - currentWrongX) * easeOut;
                    this.playerY = currentDeepY + (this.targetY - currentDeepY) * easeOut;
                }
            }
            // Screen shake while shielding
            this.screenShake = 2;
        }

        // Move animation (only if not shielding)
        if (this.isMoving && !this.isShielding) {
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

        // Background color transition (stick to character theme mostly)
        const theme = this.character.theme || { bg: { h: 220, s: 30, l: 15 } };
        // Slight hue shift based on score to keep it dynamic but close to theme
        this.targetBgHue = theme.bg.h + (Math.floor(this.score / 500) * 10) % 40;
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
            // Move one step up after changing direction
            this.handleStep();
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.save();

        // Screen shake (disabled during gameover)
        if (this.screenShake > 0.5 && this.state !== 'gameover') {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
            );
        }

        // Background
        this.renderBackground(ctx, w, h);

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

        // Render shield effect during recovery or when active
        if (this.isShielding || this.activeShield) {
            const alpha = this.isShielding ? (1 - this.shieldAnimProgress) : 0.6;
            ctx.save();
            ctx.translate(this.playerX, this.playerY + 5);
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(68, 187, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#44BBFF';
            ctx.fillStyle = `rgba(68, 187, 255, ${alpha * 0.2})`;
            ctx.fill();
            ctx.restore();
        }

        // Render particles (in world space)
        this.renderParticles(ctx);

        ctx.restore();

        // HUD (screen space)
        if (this.state === 'playing' || this.state === 'falling') {
            this.renderHUD(ctx);
        }

        // Floating texts (screen space)
        this.renderFloatingTexts(ctx);

        // Fire overlay (screen space, on top of everything)
        if ((this.state === 'falling' || this.state === 'gameover') && this.fireParticles.length > 0) {
            this.renderFire(ctx);
        }

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
            const theme = this.character.theme || {
                stair: '#7B8FA0',
                stairNext: '#9AB0C4',
                stairVisited: '#5A90D0',
            };

            if (stair.visited) {
                ctx.fillStyle = theme.stairVisited;
            } else if (i === this.currentStairIndex + 1) {
                // Next stair highlight (subtle glow)
                ctx.fillStyle = theme.stairNext;
            } else {
                ctx.fillStyle = theme.stair;
            }

            // Render stair content
            this.renderStair(ctx, sx, sy, sw, sh, stair, i, theme);

            // Render item if present
            if (stair.item) {
                ctx.save();
                ctx.translate(stair.x, sy - 15);
                const bob = Math.sin(this.frame * 0.1) * 5;
                ctx.translate(0, bob);

                // Item shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(0, 18 - bob, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Item aura
                const aura = ctx.createRadialGradient(0, 5, 2, 0, 5, 15);
                aura.addColorStop(0, stair.item.color + '66'); // 40% alpha
                aura.addColorStop(1, stair.item.color + '00'); // 0% alpha
                ctx.fillStyle = aura;
                ctx.beginPath();
                ctx.arc(0, 5, 15, 0, Math.PI * 2);
                ctx.fill();

                // Item label
                ctx.shadowBlur = 10;
                ctx.shadowColor = stair.item.color;
                ctx.font = '22px serif';
                ctx.textAlign = 'center';
                ctx.fillText(stair.item.label, 0, 10);

                ctx.restore();
            }

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

    renderFire(ctx) {
        ctx.save();

        // Glowing base at the bottom
        const baseGrad = ctx.createLinearGradient(0, this.height, 0, this.height - 120 * this.fireIntensity);
        baseGrad.addColorStop(0, `rgba(255, 80, 0, ${0.6 * this.fireIntensity})`);
        baseGrad.addColorStop(0.4, `rgba(255, 40, 0, ${0.3 * this.fireIntensity})`);
        baseGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, this.height - 120 * this.fireIntensity, this.width, 120 * this.fireIntensity);

        // Fire particles
        for (const p of this.fireParticles) {
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.8;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${p.hue}, 100%, ${50 + (1 - lifeRatio) * 20}%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    renderBackground(ctx, w, h) {
        const theme = this.character.theme || {
            bgType: 'default',
            bg: { h: 220, s: 30, l: 15 }
        };
        const bg = theme.bg;

        // Base Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `hsl(${this.bgHue}, ${bg.s}%, ${bg.l}%)`);
        gradient.addColorStop(1, `hsl(${this.bgHue + 20}, ${bg.s + 10}%, ${bg.l + 5}%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        const type = theme.bgType || 'default';

        // Draw background elements based on type
        if (type === 'default' || type === 'ocean' || type === 'space' || type === 'city' || type === 'night') {
            // Stars / Generic particles
            this.stars.forEach(star => {
                star.twinkle += star.speed;
                const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
                const starScreenY = ((star.y - this.cameraY * (type === 'ocean' ? 0.1 : 0.3)) % (h * 2));
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(star.x, starScreenY, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        if (type === 'castle') {
            // Clouds
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 5; i++) {
                const cy = ((i * 150 - this.cameraY * 0.2) % (h + 200)) - 100;
                const cx = (i * 100) % w;
                ctx.beginPath();
                ctx.arc(cx, cy, 60, 0, Math.PI * 2);
                ctx.arc(cx + 50, cy + 20, 70, 0, Math.PI * 2);
                ctx.arc(cx - 50, cy + 20, 50, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'dojo') {
            // Bamboo silhouettes
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            for (let i = 0; i < 6; i++) {
                const bx = (w / 6) * i + 20;
                ctx.fillRect(bx, 0, 10, h);
                // Joints
                for (let j = 0; j < h / 100; j++) {
                    const by = ((j * 100 - this.cameraY * 0.5) % (h + 100)) - 50;
                    ctx.fillRect(bx - 2, by, 14, 4);
                }
            }
        }

        if (type === 'cyber') {
            // Circuit lines
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < h; i += 100) {
                const ly = ((i - this.cameraY * 0.5) % (h + 100)) - 50;
                ctx.moveTo(0, ly);
                ctx.lineTo(w, ly);
                ctx.moveTo(0, ly + 20);
                ctx.lineTo(w * 0.3, ly + 20);
                ctx.lineTo(w * 0.35, ly + 60);
                ctx.lineTo(w, ly + 60);
            }
            ctx.stroke();
        }

        if (type === 'kitchen') {
            // Tablecloth pattern
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            const checkerSize = 40;
            const oy = -(this.cameraY * 0.5) % (checkerSize * 2);
            for (let y = oy - checkerSize; y < h; y += checkerSize) {
                for (let x = 0; x < w; x += checkerSize) {
                    if (((x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0) {
                        ctx.fillRect(x, y, checkerSize, checkerSize);
                    }
                }
            }
        }
    }

    renderStair(ctx, sx, sy, sw, sh, stair, index, theme) {
        const type = theme.stairType || 'default';

        // Base
        if (stair.visited) {
            ctx.fillStyle = theme.stairVisited;
        } else if (index === this.currentStairIndex + 1) {
            ctx.fillStyle = theme.stairNext;
        } else {
            ctx.fillStyle = theme.stair;
        }

        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, 4);
        ctx.fill();

        // Details based on type
        if (type === 'marble') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx + 5, sy + sh);
            ctx.lineTo(sx + sw - 10, sy);
            ctx.moveTo(sx + 15, sy + sh);
            ctx.lineTo(sx + sw, sy + 5);
            ctx.stroke();
        } else if (type === 'wood' || type === 'wood_plank') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(sx, sy + 5, sw, 2);
            ctx.fillRect(sx, sy + 15, sw, 2);
        } else if (type === 'checkered') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(sx, sy, sw / 2, sh / 2);
            ctx.fillRect(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2);
        } else if (type === 'metal') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(sx + 2, sy + 2, 4, 4);
            ctx.fillRect(sx + sw - 6, sy + 2, 4, 4);
            ctx.fillRect(sx + 2, sy + sh - 6, 4, 4);
            ctx.fillRect(sx + sw - 6, sy + sh - 6, 4, 4);
        } else if (type === 'gold') {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fillRect(sx + 5, sy + 5, sw - 10, sh - 10);
        }
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
        const h = this.height;
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

        // Fever Mode Countdown
        if (this.feverTimer > 0) {
            const secondsLeft = (this.feverTimer / 60).toFixed(1);
            const feverProgress = this.feverTimer / 300;

            ctx.save();
            ctx.translate(w / 2, h / 2 - 100);

            // Background bar
            const barW = 120;
            const barH = 8;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.roundRect(-barW / 2, 35, barW, barH, 4);
            ctx.fill();

            // Progress bar
            ctx.fillStyle = '#FF4444';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF0000';
            ctx.beginPath();
            ctx.roundRect(-barW / 2, 35, barW * feverProgress, barH, 4);
            ctx.fill();

            // Text
            ctx.fillStyle = '#FF4444';
            ctx.font = 'bold 32px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF0000';
            ctx.fillText(`FEVER!`, 0, 0);

            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 20px "Outfit", sans-serif';
            ctx.fillText(`${secondsLeft}s`, 0, 25);

            ctx.restore();
        }
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

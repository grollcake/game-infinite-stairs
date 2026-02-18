import { drawCharacter, CHARACTERS } from './Characters';
import { soundManager } from './SoundManager';

export class GameEngine {
    constructor(canvas, character) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Logical dimensions for scaling
        this.baseWidth = 360; // Designed for mobile width
        this.scale = 1;

        // Initialize dimensions
        this.resize(canvas.width, canvas.height);

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
            { id: 'coin', label: '💰', color: '#FFD700', chance: 0.12 },
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

        // Environmental Effects
        this.weatherParticles = [];
        this.screenOverlayAlpha = 0;
        this.cameraZoom = 1;
        this.targetCameraZoom = 1;

        // Announcement System (Fixed UI messages)
        this.announcementText = '';
        this.announcementTimer = 0;
        this.announcementColor = '#FFF';

        this.hitMonster = false;
        this.activeBranchStair = null;
        this.monsterSpawnCooldown = 0;
        this.magnetCoins = [];
        this.hudCoinScale = 1;
        this.sessionCoins = 0;

        // Background Image Support
        this.bgImage = null;
        if (this.character.theme && this.character.theme.bgImage) {
            this.bgImage = new Image();
            this.bgImage.src = this.character.theme.bgImage;
        }

        this.generateInitialStairs();
        this.positionPlayerOnStair(0);
    }

    spawnMagnetCoins(count) {
        // Character's screen position
        // We need to convert world playerX, playerY to screen space
        // Player is rendered at playerX, playerY in world space
        // Camera is at cameraY
        const screenX = this.playerX;
        const screenY = this.playerY - this.cameraY;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 10;
            this.magnetCoins.push({
                x: screenX,
                y: screenY,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 1) * 15, // fly upwards
                life: 0,
                state: 'exploding', // exploding -> magnetizing
                delay: i * 0.4 // Faster stagger for large counts
            });
        }

        soundManager.playMilestone?.();
    }

    updateMagnetCoins() {
        // HUD Coin target position (Top Left area)
        const padding = 15;
        const targetX = padding + 125; // Center of our coin HUD
        const targetY = padding + 22;

        for (let i = this.magnetCoins.length - 1; i >= 0; i--) {
            const coin = this.magnetCoins[i];

            if (coin.delay > 0) {
                coin.delay--;
                continue;
            }

            coin.life++;

            if (coin.state === 'exploding') {
                coin.x += coin.vx;
                coin.y += coin.vy;
                coin.vx *= 0.92;
                coin.vy *= 0.92;
                coin.vy += 0.2; // gravity

                if (coin.life > 10) { // Shorter explosion phase
                    coin.state = 'magnetizing';
                }
            } else {
                // Magnet logic
                const dx = targetX - coin.x;
                const dy = targetY - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 10) {
                    this.magnetCoins.splice(i, 1);
                    this.sessionCoins++;
                    this.hudCoinScale = 1.6; // pulse HUD
                    soundManager.playCoinCollect?.();
                    continue;
                }

                const speed = Math.min(dist * 0.25, 30); // Faster snap (0.15 -> 0.25)
                coin.x += (dx / dist) * speed;
                coin.y += (dy / dist) * speed;
            }
        }

        // Decay HUD pulse
        if (this.hudCoinScale > 1) {
            this.hudCoinScale += (1 - this.hudCoinScale) * 0.15;
        }
    }

    generateInitialStairs() {
        this.stairs = [];
        let x = this.width / 2;
        let y = this.height - 100;
        let dir = 1; // 1 = right, -1 = left
        let forcedNextDir = null;

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
            if (i > 10 && this.itemSpawnCooldown <= 0 && Math.random() < 0.25 * (this.itemSpawnMultiplier || 1)) {
                const rand = Math.random();
                let cumulative = 0;
                for (const type of this.itemTypes) {
                    cumulative += type.chance * 2;
                    if (rand < cumulative) {
                        stair.item = { ...type };
                        this.itemSpawnCooldown = type.id === 'rocket' ? 20 : 10;
                        break;
                    }
                }
            }

            if (this.itemSpawnCooldown > 0) this.itemSpawnCooldown--;

            this.stairs.push(stair);

            // Preparation for next stair
            const nextY = y - (this.stairHeight + 20);
            let nextDir = dir;
            if (forcedNextDir !== null) {
                nextDir = forcedNextDir;
                forcedNextDir = null;
            } else if (Math.random() < 0.4) {
                nextDir = -nextDir;
            }

            // Boundary checks for next position
            let nextX = x + nextDir * (this.stairWidth * 0.7);
            if (nextX < 80) { nextDir = 1; nextX = x + nextDir * (this.stairWidth * 0.7); }
            if (nextX > this.width - 80) { nextDir = -1; nextX = x + nextDir * (this.stairWidth * 0.7); }

            // Add branch gimmick (Variation: 1-step immediate or 2-step lure)
            const monsterSpawnChance = Math.min(0.15, 0.03 + Math.floor(i / 50) * 0.01);
            if (i > 30 && !stair.item && this.monsterSpawnCooldown <= 0 && Math.random() < monsterSpawnChance) {
                const branchDir = -nextDir;
                const b1x = x + branchDir * (this.stairWidth * 0.7);
                const isTwoStep = Math.random() < 0.4;

                if (b1x > 60 && b1x < this.width - 60) {
                    if (isTwoStep) {
                        const b2x = b1x + branchDir * (this.stairWidth * 0.7);
                        if (b2x > 40 && b2x < this.width - 40) {
                            const b1 = { x: b1x, y: nextY, direction: branchDir, width: this.stairWidth, visited: false };
                            const b2 = {
                                x: b2x, y: nextY - (this.stairHeight + 20), direction: branchDir, width: this.stairWidth, visited: false,
                                isMonster: true, monsterType: ['👾', '👹', '👻', '💀'][Math.floor(Math.random() * 4)]
                            };
                            b1.next = b2;
                            stair.branch = b1;
                            this.monsterSpawnCooldown = 15;
                            forcedNextDir = nextDir; // Force symmetry for the next level
                        }
                    } else {
                        stair.branch = {
                            x: b1x, y: nextY, direction: branchDir, width: this.stairWidth, visited: false,
                            isMonster: true, monsterType: ['👾', '👹', '👻', '💀'][Math.floor(Math.random() * 4)]
                        };
                        this.monsterSpawnCooldown = 10;
                    }
                }
            }

            if (this.monsterSpawnCooldown > 0) this.monsterSpawnCooldown--;

            dir = nextDir;
            x = nextX;
            y = nextY;
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
        let forcedNextDir = null;

        for (let i = 0; i < 50; i++) {
            const prevStair = i === 0 ? lastStair : this.stairs[this.stairs.length - 1];
            let nextDir = prevStair.direction;

            if (forcedNextDir !== null) {
                nextDir = forcedNextDir;
                forcedNextDir = null;
            } else if (Math.random() < 0.4) {
                nextDir = -nextDir;
            }

            let nextX = prevStair.x + nextDir * (this.stairWidth * 0.7);
            const nextY = prevStair.y - (this.stairHeight + 20);

            // Boundary checks for next position
            if (nextX < 80) { nextDir = 1; nextX = prevStair.x + nextDir * (this.stairWidth * 0.7); }
            if (nextX > this.width - 80) { nextDir = -1; nextX = prevStair.x + nextDir * (this.stairWidth * 0.7); }

            const stair = {
                x: nextX,
                y: nextY,
                direction: nextDir,
                width: this.stairWidth,
                visited: false,
                item: null
            };

            // Spawn item (only if not rocketing or in fever)
            if (this.itemSpawnCooldown <= 0 && !this.isRocketing && this.feverTimer <= 0 && Math.random() < 0.2 * (this.itemSpawnMultiplier || 1)) {
                const rand = Math.random();
                let cumulative = 0;
                const totalChance = this.itemTypes.reduce((sum, t) => sum + t.chance, 0);
                const normalizedRand = rand * totalChance;

                for (const type of this.itemTypes) {
                    cumulative += type.chance;
                    if (normalizedRand < cumulative) {
                        stair.item = { ...type };
                        this.itemSpawnCooldown = type.id === 'rocket' ? 20 : 10;
                        break;
                    }
                }
            }

            if (this.itemSpawnCooldown > 0) this.itemSpawnCooldown--;

            // Add branch gimmick to the PREVIOUS stair
            const currentHeight = this.stairs.length;
            const monsterSpawnChance = Math.min(0.15, 0.03 + Math.floor(currentHeight / 50) * 0.01);

            if (prevStair && !prevStair.item && !prevStair.branch && this.monsterSpawnCooldown <= 0 && Math.random() < monsterSpawnChance) {
                const branchDir = -nextDir;
                const b1x = prevStair.x + branchDir * (this.stairWidth * 0.7);
                const isTwoStep = Math.random() < 0.4;

                if (b1x > 60 && b1x < this.width - 60) {
                    if (isTwoStep) {
                        const b2x = b1x + branchDir * (this.stairWidth * 0.7);
                        if (b2x > 40 && b2x < this.width - 40) {
                            const b1 = { x: b1x, y: nextY, direction: branchDir, width: this.stairWidth, visited: false };
                            const b2 = {
                                x: b2x, y: nextY - (this.stairHeight + 20), direction: branchDir, width: this.stairWidth, visited: false,
                                isMonster: true, monsterType: ['👾', '👹', '👻', '💀'][Math.floor(Math.random() * 4)]
                            };
                            b1.next = b2;
                            prevStair.branch = b1;
                            this.monsterSpawnCooldown = 15;
                            forcedNextDir = nextDir; // Ensure symmetry by keeping original path's direction straight
                        }
                    } else {
                        prevStair.branch = {
                            x: b1x, y: nextY, direction: branchDir, width: this.stairWidth, visited: false,
                            isMonster: true, monsterType: ['👾', '👹', '👻', '💀'][Math.floor(Math.random() * 4)]
                        };
                        this.monsterSpawnCooldown = 10;
                    }
                }
            }

            if (this.monsterSpawnCooldown > 0) this.monsterSpawnCooldown--;

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

        // --- BRANCH LOGIC ---
        // If on the intermediate step of a 2-step branch, next step is the monster
        if (this.activeBranchStair && this.activeBranchStair.next) {
            const monsterStair = this.activeBranchStair.next;
            this.isMoving = true;
            this.moveProgress = 0;
            this.targetX = monsterStair.x;
            this.targetY = monsterStair.y - 16;
            this.moveStartX = this.playerX;
            this.moveStartY = this.playerY;
            this.hitMonster = true;
            this.activeBranchStair = null;
            return;
        }

        // Check for branch selection from safe path
        if (currentStair.branch) {
            const branchDx = currentStair.branch.x - currentStair.x;
            const branchDir = branchDx > 0 ? 1 : -1;

            if (this.playerDirection === branchDir) {
                this.isMoving = true;
                this.moveProgress = 0;
                this.targetX = currentStair.branch.x;
                this.targetY = currentStair.branch.y - 16;
                this.moveStartX = this.playerX;
                this.moveStartY = this.playerY;

                if (currentStair.branch.next) {
                    // This is the first step of a 2-step branch, player moves to b1
                    this.activeBranchStair = currentStair.branch;
                } else {
                    // This is a 1-step branch, player moves directly to the monster
                    this.hitMonster = true;
                }
                return;
            }
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

        // Coin celebration every 10 combo (Exponential growth: 2, 4, 8, 16...)
        if (this.combo > 0 && this.combo % 10 === 0) {
            const milestone = this.combo / 10;
            const coinCount = Math.min(256, Math.pow(2, milestone));
            this.spawnMagnetCoins(coinCount);
        }

        // Sound
        soundManager.playStep(this.score);

        // Announcement updates - Only on milestones to keep it clean
        if (this.combo > 0 && this.combo % 20 === 0) {
            this.announcementText = `${this.combo} COMBO!`;
            this.announcementTimer = 90;
            this.announcementColor = '#FFD700';
        }

        // Step particles
        this.addStepParticles(startX, startY + 16);

        // Milestone check (every 100 floors)
        if (this.score > 0 && this.score % 100 === 0) {
            this.milestoneFlash = 60;
            soundManager.playMilestone();
            this.announcementText = `🎉 ${this.score}층 돌파!`;
            this.announcementTimer = 120;
            this.announcementColor = '#FFD700';

            // Milestone particles explosion
            const centerX = this.width / 2;
            const centerY = this.cameraY + this.height / 2;
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: centerX,
                    y: centerY,
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
        if (item.id !== 'coin') {
            this.addFloatingText(`${item.label} GET!`, this.playerX, this.playerY - 40, item.color, 1.2);
        }

        switch (item.id) {
            case 'coin':
                this.spawnMagnetCoins(10);
                break;
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

        // Update total coins (Purely from collected session coins now)
        const earnedCoins = this.sessionCoins * (this.coinMultiplier || 1);
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
        this.activeBranchStair = null;
        this.magnetCoins = [];
        this.sessionCoins = 0;
        this.hudCoinScale = 1;

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

    startGame(options = {}) {
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
        this.announcementText = '';
        this.announcementTimer = 0;
        this.announcementColor = '#FFF';

        // Reset item states
        this.activeShield = false;
        this.feverTimer = 0;
        this.isRocketing = false;
        this.rocketStepsRemaining = 0;
        this.itemSpawnCooldown = 0;
        this.hitMonster = false;
        this.activeBranchStair = null;
        this.monsterSpawnCooldown = 0;
        this.magnetCoins = [];
        this.sessionCoins = 0;
        this.hudCoinScale = 1;

        // Clear fire
        this.fireParticles = [];
        this.fireIntensity = 0;

        // Apply shop options
        this.coinMultiplier = 1;
        if (options.energyMaster) {
            this.energyDecayRate *= 0.8;
        }
        if (options.recoveryBoost) {
            this.energyRecoverAmount *= 1.3;
        }
        if (options.coinBooster) {
            this.coinMultiplier = 2;
        }
        if (options.startShield) {
            this.activeShield = true;
        }
        if (options.feverStart) {
            this.feverTimer = 180; // 3 seconds at 60fps
        }
        this.itemSpawnMultiplier = options.itemLuck ? 1.5 : 1;

        this.generateInitialStairs();
        this.positionPlayerOnStair(0);
        this.cameraY = 0;
        this.targetCameraY = 0;

        soundManager.init();
        soundManager.playStartGame();
    }

    activateShield() {
        if (this.state !== 'playing' || this.activeShield) return false;
        this.activeShield = true;
        this.addFloatingText('🛡️ 쉴드!', this.playerX, this.playerY - 30, '#4FC3F7', 1.2);
        return true;
    }

    activateFever() {
        if (this.state !== 'playing' || this.feverTimer > 0) return false;
        this.feverTimer = 180; // 3 seconds
        this.addFloatingText('🔥 피버!', this.playerX, this.playerY - 30, '#FF6B6B', 1.2);
        return true;
    }

    activateRocket() {
        if (this.state !== 'playing' || this.isRocketing) return false;
        this.startRocket();
        return true;
    }

    update() {
        this.frame++;
        this.updateMagnetCoins();

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

                // Check if we hit a monster
                if (this.hitMonster) {
                    this.addFloatingText('GGGRRRRR!!', this.playerX, this.playerY - 50, '#FF0000', 1.5);
                    this.screenShake = 15;
                    setTimeout(() => {
                        this.triggerGameOver();
                        this.hitMonster = false;
                    }, 500);
                    return;
                }

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

        // Update environment
        this.updateEnvironment();

        // Update floating texts
        this.updateFloatingTexts();

        // Background color transition (stick to character theme mostly)
        const theme = this.character.theme || { bg: { h: 220, s: 30, l: 15 } };
        // Slight hue shift based on score to keep it dynamic but close to theme
        this.targetBgHue = theme.bg.h + (Math.floor(this.score / 500) * 10) % 40;
        this.bgHue += (this.targetBgHue - this.bgHue) * 0.02;

        // Camera Zoom transitions
        if (this.feverTimer > 0 || this.isRocketing) {
            this.targetCameraZoom = 1.15; // Zoom in for intensity
        } else {
            this.targetCameraZoom = 1.0;
        }
        this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * 0.05;

        // Fever screen overlay
        if (this.feverTimer > 0) {
            this.screenOverlayAlpha = Math.min(0.3, this.screenOverlayAlpha + 0.02);
        } else {
            this.screenOverlayAlpha = Math.max(0, this.screenOverlayAlpha - 0.02);
        }

        // Screen shake decay
        if (this.screenShake > 0) this.screenShake *= 0.9;

        // Milestone flash decay
        if (this.milestoneFlash > 0) this.milestoneFlash--;

        // Announcement timer decay
        if (this.announcementTimer > 0) this.announcementTimer--;
    }

    updateEnvironment() {
        if (!this.weatherParticles) this.weatherParticles = [];
        const type = this.character.theme?.bgType || 'default';
        const maxWeather = (type === 'default' || type === 'space') ? 0 : 40;

        if (this.weatherParticles.length < maxWeather && this.frame % 3 === 0) {
            if (type === 'night' || type === 'castle') {
                this.weatherParticles.push({
                    x: Math.random() * this.width,
                    y: -20,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 3 + 2,
                    size: Math.random() * 2 + 1,
                    type: 'snow',
                    color: '#FFF'
                });
            } else if (type === 'dojo' || type === 'kitchen') {
                this.weatherParticles.push({
                    x: Math.random() * this.width,
                    y: -20,
                    vx: Math.random() * 1 + 1,
                    vy: Math.random() * 1.5 + 1.5,
                    size: Math.random() * 4 + 3,
                    rot: Math.random() * Math.PI * 2,
                    rotV: (Math.random() - 0.5) * 0.1,
                    type: 'leaf',
                    color: type === 'dojo' ? '#4A7c44' : '#F6AD55'
                });
            } else if (type === 'cyber') {
                this.weatherParticles.push({
                    x: Math.random() * this.width,
                    y: -20,
                    vy: Math.random() * 8 + 8,
                    size: Math.random() * 1 + 1,
                    len: Math.random() * 20 + 10,
                    type: 'digit',
                    color: '#22d3ee'
                });
            } else if (type === 'palace' || type === 'city') {
                this.weatherParticles.push({
                    x: Math.random() * this.width,
                    y: -20,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: Math.random() * 1 + 1,
                    size: Math.random() * 2 + 2,
                    type: 'dust',
                    color: type === 'palace' ? '#FAD02E' : '#A0A0B0',
                    life: 200
                });
            }
        }

        for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
            const p = this.weatherParticles[i];
            p.y += p.vy;
            if (p.vx) p.x += p.vx;
            if (p.rot) p.rot += p.rotV;
            if (p.y > this.height + 50) this.weatherParticles.splice(i, 1);
        }
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
        ctx.scale(this.scale, this.scale);

        // Apply Camera Zoom (for Fever/Rocket)
        if (this.cameraZoom !== 1) {
            ctx.translate(w / 2, h / 2);
            ctx.scale(this.cameraZoom, this.cameraZoom);
            ctx.translate(-w / 2, -h / 2);
        }

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

        // Render step particles (in world space)
        this.renderStepParticles(ctx);

        // Render floating texts (in world space)
        // ... existing world-space rendering (stairs, player, particles)
        this.renderFloatingTexts(ctx);

        ctx.restore(); // Restore Camera transform (Save 2)
        ctx.restore(); // Restore Zoom and Shake (Save 1)

        // Switch to Screen-space rendering (but still logical scale)
        ctx.save();
        ctx.scale(this.scale, this.scale);

        // Magnet Coins (rendered above weather but below HUD)
        this.renderMagnetCoins(ctx);

        // Render weather particles (in screen space)
        this.renderWeatherParticles(ctx);

        // HUD (screen space)
        if (this.state === 'playing' || this.state === 'falling') {
            this.renderHUD(ctx);
        }

        // Fire overlay (screen space, on top of everything)
        if ((this.state === 'falling' || this.state === 'gameover') && this.fireParticles.length > 0) {
            this.renderFire(ctx);
        }

        // Fever/Special Overlay
        if (this.screenOverlayAlpha > 0) {
            const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 1.2);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `rgba(255, 50, 0, ${this.screenOverlayAlpha})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Speed lines during intense movement
            if (this.moveSpeed > this.baseMoveSpeed * 2) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.screenOverlayAlpha * 0.5})`;
                ctx.lineWidth = 1;
                for (let i = 0; i < 15; i++) {
                    const x = (this.frame * 20 + i * 50) % w;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x + 20, h);
                    ctx.stroke();
                }
            }
        }

        ctx.restore(); // Final restore for logical scale save in this new block
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

            const theme = this.character.theme || {
                stair: '#7B8FA0',
                stairNext: '#9AB0C4',
                stairVisited: '#5A90D0',
            };

            const type = theme.stairType || 'default';

            // Stair shadow (Not for transparent or neon types)
            if (type !== 'transparent_with_flag' && type !== 'neon' && type !== 'glass') {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(sx + 3, sy + 3, sw, sh);
            }

            // Render main stair body and details
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
                aura.addColorStop(0, stair.item.color + '66');
                aura.addColorStop(1, stair.item.color + '00');
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

            // Common overlays (Not for special types)
            if (type !== 'transparent_with_flag' && type !== 'neon' && type !== 'glass') {
                // Subtle highlight
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(sx + 2, sy + 1, sw - 4, sh / 3);

                // Generic outline
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(sx, sy, sw, sh, 4);
                ctx.stroke();
            }

            // Floor number
            if (i > 0 && i % 10 === 0) {
                const isBright = type === 'neon' || type === 'glass' || type === 'transparent_with_flag';
                ctx.fillStyle = isBright ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
                ctx.font = '10px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                const labelY = type === 'transparent_with_flag' ? sy + sh + 15 : sy + sh - 3;
                ctx.fillText(`${i}`, stair.x, labelY);
            }

            // Render branch (monster path)
            if (stair.branch) {
                const b1 = stair.branch;
                const b1sx = b1.x - b1.width / 2;
                const b1sy = b1.y;

                // Render first branch step
                this.renderStair(ctx, b1sx, b1sy, b1.width, this.stairHeight, b1, -1, theme);

                // If 1-step monster, render effect on b1
                if (b1.isMonster) {
                    this.renderMonsterEffect(ctx, b1, i);
                }

                // If 2-step monster, render b2 and effect on b2
                if (b1.next) {
                    const b2 = b1.next;
                    const b2sx = b2.x - b2.width / 2;
                    const b2sy = b2.y;
                    this.renderStair(ctx, b2sx, b2sy, b2.width, this.stairHeight, b2, -1, theme);
                    this.renderMonsterEffect(ctx, b2, i);
                }
            }
        }
    }

    renderMonsterEffect(ctx, branchStair, index) {
        ctx.save();
        ctx.translate(branchStair.x, branchStair.y - 12);
        const monsterBob = Math.sin(this.frame * 0.15 + index) * 6;
        ctx.translate(0, monsterBob);

        // Danger area glow
        const areaGlow = ctx.createRadialGradient(0, 12, 5, 0, 12, 35);
        areaGlow.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
        areaGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = areaGlow;
        ctx.fillRect(-branchStair.width / 2, 0, branchStair.width, 20);

        // Monster emoji
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#FF0000';
        ctx.fillText(branchStair.monsterType, 0, 10);

        // Dangerous label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 9px "Outfit", sans-serif';
        ctx.fillText('DANGER', 0, -12);

        ctx.restore();
    }

    renderMagnetCoins(ctx) {
        for (const coin of this.magnetCoins) {
            if (coin.delay > 0) continue;

            ctx.save();
            ctx.translate(coin.x, coin.y);

            // Spinning effect
            const spin = Math.sin(this.frame * 0.2 + coin.life * 0.1);
            ctx.scale(Math.abs(spin), 1);

            // Outer gold
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Shiny highlight
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(-2, -2, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    renderStepParticles(ctx) {
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

    renderWeatherParticles(ctx) {
        if (!this.weatherParticles) return;

        for (const p of this.weatherParticles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = p.color || '#FFF';
            ctx.globalAlpha = 0.8;

            if (p.type === 'snow' || p.type === 'dust') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'leaf') {
                ctx.rotate(p.rot || 0);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'digit') {
                ctx.fillRect(0, 0, p.size, p.len);
                // Add a tiny glow
                ctx.shadowBlur = 5;
                ctx.shadowColor = p.color;
                ctx.fillRect(0, 0, p.size, p.len);
            }
            ctx.restore();
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

        // If background image is set, make canvas transparent so CSS bg shows through
        if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            ctx.clearRect(0, 0, w, h);
        } else {
            // Fallback: Base Gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, `hsl(${this.bgHue}, ${bg.s}%, ${bg.l}%)`);
            gradient.addColorStop(1, `hsl(${this.bgHue + 20}, ${bg.s + 10}%, ${bg.l + 5}%)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        const type = theme.bgType || 'default';

        // Draw background elements based on type
        if (type === 'default' || type === 'space' || type === 'city' || type === 'night') {
            // Stars / Generic particles
            this.stars.forEach(star => {
                star.twinkle += star.speed;
                const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
                const starScreenY = ((star.y - this.cameraY * 0.3) % (h * 2));
                // Make sure starScreenY is positive for wrapping
                const ry = (starScreenY + h * 2) % (h * 2);

                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(star.x, ry, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (type === 'ocean') {
            // Bubbles rising up
            this.stars.forEach(star => {
                // Update bubble position (move up)
                // We use a temporary modified Y for rendering to simulate rising without changing state permanently if we switch back
                // But simply using the loop index and time allows for deterministic bubbles

                const speed = star.speed * 2;
                const rise = (this.frame * speed) % h;
                const y = (star.y - rise - this.cameraY * 0.2);
                const ry = ((y % h) + h) % h;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(star.x, ry, star.size + 1, 0, Math.PI * 2);
                ctx.stroke();

                // Shine
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(star.x - star.size / 3, ry - star.size / 3, star.size / 3, 0, Math.PI * 2);
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
        let type = theme.stairType || 'default';

        // Force transparent stairs for Viking (just in case theme prop is stale)
        if (this.character && this.character.id === 'viking') {
            type = 'transparent_with_flag';
        }

        const isVisited = stair.visited;
        const isNext = index === this.currentStairIndex + 1;
        const baseColor = isVisited ? theme.stairVisited : (isNext ? theme.stairNext : theme.stair);

        // 1. Transparent stair logic (Viking)
        if (type === 'transparent_with_flag') {
            const nextStair = this.stairs[index + 1];
            if (nextStair) {
                let currDir = stair.direction;
                if (index > 0) {
                    const prevStair = this.stairs[index - 1];
                    currDir = Math.sign(stair.x - prevStair.x);
                }
                let nextDir = Math.sign(nextStair.x - stair.x);
                if (nextDir === 0) nextDir = currDir;

                if (currDir !== nextDir) {
                    // Draw Improved Flag
                    const fx = sx + sw / 2;
                    const fy = sy;
                    const wave = Math.sin(this.frame * 0.15 + index) * 3;

                    // Pole shadow
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(fx + 2, fy);
                    ctx.lineTo(fx + 2, fy - 40);
                    ctx.stroke();

                    // Pole
                    ctx.strokeStyle = '#5D2E0C'; // Dark Wood
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(fx, fy - 40);
                    ctx.stroke();

                    // Flag cloth with wave
                    ctx.fillStyle = '#C0392B';
                    ctx.beginPath();
                    ctx.moveTo(fx, fy - 40);
                    ctx.quadraticCurveTo(fx + 12 + wave, fy - 45, fx + 25 + wave, fy - 35);
                    ctx.lineTo(fx + 25 + wave, fy - 25);
                    ctx.quadraticCurveTo(fx + 12 + wave, fy - 35, fx, fy - 30);
                    ctx.fill();

                    // Flag detail (W crossed)
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(fx + 5, fy - 35);
                    ctx.lineTo(fx + 10, fy - 28);
                    ctx.lineTo(fx + 15, fy - 35);
                    ctx.stroke();
                }
            }

            const isDead = this.state === 'falling' || this.state === 'gameover';
            if (!isDead && !stair.visited) return;
            ctx.fillStyle = isVisited ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)';
        } else {
            ctx.fillStyle = baseColor;
        }

        // Draw Base Shape
        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, 4);
        ctx.fill();

        // 2. Type-specific decorations
        if (type === 'marble') {
            // Elegant Marble Veins
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(sx + sw * 0.1, sy + sh);
            ctx.bezierCurveTo(sx + sw * 0.3, sy + sh * 0.7, sx + sw * 0.2, sy + sh * 0.3, sx + sw * 0.5, sy);
            ctx.moveTo(sx + sw * 0.6, sy + sh);
            ctx.bezierCurveTo(sx + sw * 0.8, sy + sh * 0.5, sx + sw * 0.7, sy + sh * 0.2, sx + sw * 0.9, sy);
            ctx.stroke();

            // Glossy Shine
            const grad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
            grad.addColorStop(0, 'rgba(255,255,255,0.2)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.05)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, sy, sw, sh);

        } else if (type === 'wood' || type === 'wood_plank') {
            // Detailed Wood Grain
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                const wy = sy + (sh / 4) * i;
                ctx.beginPath();
                ctx.moveTo(sx, wy);
                ctx.quadraticCurveTo(sx + sw / 2, wy + Math.sin(index + i) * 3, sx + sw, wy);
                ctx.stroke();
            }
            // Knots
            if (index % 3 === 0) {
                ctx.beginPath();
                ctx.ellipse(sx + sw * 0.7, sy + sh * 0.5, 5, 2, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

        } else if (type === 'checkered') {
            // Kitchen Tiles
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(sx, sy, sw / 2, sh / 2);
            ctx.fillRect(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeRect(sx, sy, sw, sh);

        } else if (type === 'metal') {
            // Industrial Metal
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(sx, sy, sw, sh / 2);
            // Rivets
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            [[4, 4], [sw - 8, 4], [4, sh - 8], [sw - 8, sh - 8]].forEach(([rx, ry]) => {
                ctx.beginPath();
                ctx.arc(sx + rx, sy + ry, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            // Tread pattern
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            for (let i = 10; i < sw; i += 15) {
                ctx.beginPath();
                ctx.moveTo(sx + i, sy + 5);
                ctx.lineTo(sx + i + 5, sy + sh - 5);
                ctx.stroke();
            }

        } else if (type === 'gold') {
            // Sparkling Gold
            const sparkle = Math.sin(this.frame * 0.1 + index) * 0.5 + 0.5;
            const grad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
            grad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.3 * sparkle) + ')');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, sy, sw, sh);

            // Royal border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);

        } else if (type === 'neon') {
            // Cyberpunk Neon
            ctx.strokeStyle = isVisited ? '#9F7AEA' : '#4FD1C5';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
            ctx.shadowBlur = 0;

            // Internal Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(sx + sw / 3, sy); ctx.lineTo(sx + sw / 3, sy + sh);
            ctx.moveTo(sx + 2 * sw / 3, sy); ctx.lineTo(sx + 2 * sw / 3, sy + sh);
            ctx.stroke();

        } else if (type === 'gothic') {
            // Dark stone with red cracks
            ctx.strokeStyle = 'rgba(229, 62, 62, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx + 5, sy + 5);
            ctx.lineTo(sx + 15, sy + 12);
            ctx.lineTo(sx + 10, sy + sh - 5);
            ctx.moveTo(sx + sw - 10, sy + 2);
            ctx.lineTo(sx + sw - 20, sy + 15);
            ctx.stroke();

            // Subtle bat/crest symbol
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(sx + sw / 2, sy + sh / 2, 6, 0, Math.PI, true);
            ctx.lineTo(sx + sw / 2, sy + sh / 2 + 4);
            ctx.fill();

        } else if (type === 'glass') {
            // Refractive Glass
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + sw * 0.7, sy);
            ctx.lineTo(sx + sw * 0.3, sy + sh);
            ctx.lineTo(sx, sy + sh);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx, sy, sw, sh);
        } else {
            // Default - Stone texture
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(sx + (i * 13) % sw, sy + (i * 7) % sh, 3, 3);
            }
        }
    }

    renderFloatingTexts(ctx) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
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
        const hudH = 40;
        const hudY = padding;

        // 1. Unified Stats Bar (Score & Coins)
        const statsBarW = 180;
        ctx.save();
        // Glassmorphism background
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.roundRect(padding, hudY, statsBarW, hudH, hudH / 2);
        ctx.fill();

        // Vertical Separator
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding + statsBarW / 2, hudY + 8);
        ctx.lineTo(padding + statsBarW / 2, hudY + hudH - 8);
        ctx.stroke();

        // Score Section
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '16px "Outfit", sans-serif';
        ctx.fillText('🏆', padding + 12, hudY + hudH / 2);

        ctx.font = 'bold 18px "Outfit", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.score.toString(), padding + 35, hudY + hudH / 2 + 1);

        // Coin Section
        const coinStartX = padding + statsBarW / 2 + 12;
        // Miniature silver/gold coin icon
        ctx.save();
        ctx.translate(coinStartX + 5, hudY + hudH / 2);
        ctx.scale(this.hudCoinScale, this.hudCoinScale);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.font = 'bold 18px "Outfit", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.sessionCoins.toString(), coinStartX + 20, hudY + hudH / 2 + 1);
        ctx.restore();

        // 2. Combo Display (Top Right - Minimalist)
        if (this.combo > 2) {
            const comboW = 70;
            const intensity = Math.min(1, this.combo / 100);
            const comboColor = `hsl(${45 - intensity * 45}, 100%, 50%)`;

            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = comboColor;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = comboColor;
            ctx.font = 'bold 24px "Outfit", sans-serif';
            ctx.fillText(`${this.combo}`, w - padding, hudY + hudH / 2 - 5);

            ctx.font = 'bold 9px "Outfit", sans-serif';
            ctx.globalAlpha = 0.8;
            ctx.fillText('COMBO', w - padding, hudY + hudH / 2 + 12);

            const timerRatio = this.comboTimer / 60;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.roundRect(w - padding - 60, hudY + hudH - 4, 60, 3, 2);
            ctx.fill();

            ctx.fillStyle = comboColor;
            ctx.beginPath();
            ctx.roundRect(w - padding - 60 * timerRatio, hudY + hudH - 4, 60 * timerRatio, 3, 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Announcement Display (Top Center)
        if (this.announcementTimer > 0) {
            ctx.save();
            const alpha = Math.min(1, this.announcementTimer / 20);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.announcementColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.announcementColor;
            ctx.font = 'bold 20px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.announcementText, w / 2, hudY + hudH + 30 + (1 - alpha) * 15);
            ctx.restore();
        }

        // 4. Energy Bar (Bottom - Refined)
        const barWidth = w - 2 * padding;
        const barHeight = 8;
        const barY = this.height - padding - barHeight - 5;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(padding, barY - 2, barWidth, barHeight + 4, 6);
        ctx.fill();

        const energyRatio = this.energy / this.maxEnergy;
        let barColor = energyRatio > 0.5 ? `hsl(${120 * energyRatio + 20}, 80%, 55%)` : (energyRatio > 0.25 ? '#FFB800' : '#FF4444');
        if (energyRatio <= 0.25 && Math.floor(this.frame / 8) % 2 === 0) barColor = '#FF6666';

        ctx.fillStyle = barColor;
        ctx.shadowBlur = energyRatio < 0.3 ? 10 : 0;
        ctx.shadowColor = barColor;
        ctx.beginPath();
        ctx.roundRect(padding + 2, barY, (barWidth - 4) * energyRatio, barHeight, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 8px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ENERGY', w / 2, barY - 6);

        // Fever Mode Countdown
        if (this.feverTimer > 0) {
            const secondsLeft = (this.feverTimer / 60).toFixed(1);
            const feverProgress = this.feverTimer / 300;
            ctx.save();
            ctx.translate(w / 2, this.height / 2 - 100);
            ctx.fillStyle = '#FF4444';
            ctx.font = 'bold 36px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FF0000';
            ctx.fillText(`FEVER!`, 0, 0);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.roundRect(-50, 20, 100, 4, 2); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.roundRect(-50, 20, 100 * feverProgress, 4, 2); ctx.fill();
            ctx.font = 'bold 16px "Outfit", sans-serif';
            ctx.fillText(`${secondsLeft}s`, 0, 45);
            ctx.restore();
        }
    }

    setCharacter(character) {
        this.character = character;

        // Update background image if character changes
        if (this.character.theme && this.character.theme.bgImage) {
            this.bgImage = new Image();
            this.bgImage.src = this.character.theme.bgImage;
        } else {
            this.bgImage = null;
        }

        // Update bgHue for fallback gradient
        const theme = this.character.theme || {
            bg: { h: 220, s: 30, l: 15 }
        };
        this.bgHue = theme.bg.h;
        this.targetBgHue = theme.bg.h;
    }

    onGameOver(callback) {
        this.gameOverCallback = callback;
    }

    resize(width, height) {
        // Calculate scale to fit logical width (mobile design) into actual width
        // If width is larger than baseWidth (e.g. tablet), we scale up
        // If width is smaller or equal (phone), we stick to 1:1 or slight shrink

        // iPad Portrait (approx 600px in GameCanvas) -> Scale ~1.6
        this.scale = width / this.baseWidth;

        // Determine "logical" dimensions that game logic runs on
        this.width = this.baseWidth;
        this.height = height / this.scale;

        // Force regeneration of stars to cover new logical area
        if (this.stars) {
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
        }

        // Clear weather on resize
        this.weatherParticles = [];
    }

    destroy() {
        // Cleanup
    }
}

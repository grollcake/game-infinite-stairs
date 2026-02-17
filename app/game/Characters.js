// Character definitions with pixel-art style rendering
export const CHARACTERS = [
    {
        id: 'default',
        name: '파랑이',
        description: '기본 캐릭터',
        unlockScore: 0,
        colors: {
            body: '#4A90D9',
            bodyDark: '#3570B0',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#333333',
            eyeWhite: '#FFFFFF',
            feet: '#333333',
            hat: null,
            accent: '#5BA0E9',
        },
        theme: {
            bgType: 'default',
            stairType: 'default',
            bg: { h: 215, s: 60, l: 15 },
            stair: '#5D7C9D',
            stairNext: '#8FAECF',
            stairVisited: '#4B90D6',
        }
    },
    {
        id: 'ninja',
        name: '닌자',
        description: '재빠른 닌자',
        unlockScore: 0,
        colors: {
            body: '#2D2D2D',
            bodyDark: '#1A1A1A',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#FF3333',
            eyeWhite: '#FFFFFF',
            feet: '#2D2D2D',
            hat: '#C00000',
            accent: '#FF4444',
        },
        theme: {
            bgType: 'dojo',
            stairType: 'wood',
            bg: { h: 350, s: 50, l: 10 },
            stair: '#3D3D3D',
            stairNext: '#5C5C5C',
            stairVisited: '#9E2A2B',
        }
    },
    {
        id: 'princess',
        name: '공주',
        description: '우아한 공주님',
        unlockScore: 0,
        colors: {
            body: '#FF69B4',
            bodyDark: '#E0509A',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#6633CC',
            eyeWhite: '#FFFFFF',
            feet: '#FFD700',
            hat: '#FFD700',
            accent: '#FF85C8',
        },
        theme: {
            bgType: 'castle',
            stairType: 'marble',
            bg: { h: 325, s: 60, l: 85 }, // Much lighter pink
            stair: '#FFC0CB',
            stairNext: '#FFE4E1',
            stairVisited: '#FF69B4',
        }
    },
    {
        id: 'robot',
        name: '로봇',
        description: '최첨단 로봇',
        unlockScore: 0,
        colors: {
            body: '#A0A0B0',
            bodyDark: '#808090',
            head: '#C0C0D0',
            headOutline: '#909098',
            eye: '#00FF88',
            eyeWhite: '#003322',
            feet: '#606070',
            hat: '#FF6600',
            accent: '#B0B0C0',
        },
        theme: {
            bgType: 'cyber',
            bgImage: '/bg-dotgame.png',
            stairType: 'metal',
            bg: { h: 210, s: 30, l: 10 },
            stair: '#4A5568',
            stairNext: '#718096',
            stairVisited: '#22D3EE',
        }
    },
    {
        id: 'viking',
        name: '바이킹',
        description: '용맹한 바이킹',
        unlockScore: 0,
        colors: {
            body: '#8B4513',
            bodyDark: '#5D2E0C',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#333333',
            eyeWhite: '#FFFFFF',
            feet: '#2D2D2D',
            hat: '#C0C0C0',
            accent: '#D2B48C',
        },
        theme: {
            bgType: 'ocean',
            stairType: 'transparent_with_flag',
            bg: { h: 200, s: 60, l: 20 }, // 짙은 바다색
            stair: 'rgba(0,0,0,0)', // 투명
            stairNext: 'rgba(0,0,0,0)', // 투명
            stairVisited: 'rgba(255,255,255,0.2)', // 지나온 길은 살짝 보이게 (선택사항, 하지만 UX상 필요해 보임. 일단 투명으로)
        }
    },
    {
        id: 'chef',
        name: '요리사',
        description: '최고의 요리사',
        unlockScore: 0,
        colors: {
            body: '#EBEDEF',
            bodyDark: '#D0D3D4',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#333333',
            eyeWhite: '#FFFFFF',
            feet: '#333333',
            hat: '#FFFFFF',
            accent: '#FF4444',
        },
        theme: {
            bgType: 'kitchen',
            stairType: 'checkered',
            bg: { h: 40, s: 20, l: 90 }, // Light cream
            stair: '#E2E8F0',
            stairNext: '#FFFFFF',
            stairVisited: '#F6AD55',
        }
    },
    {
        id: 'alien',
        name: '외계인',
        description: '신비한 외계인',
        unlockScore: 0,
        colors: {
            body: '#2ECC71',
            bodyDark: '#27AE60',
            head: '#2ECC71',
            headOutline: '#27AE60',
            eye: '#000000',
            eyeWhite: '#000000',
            feet: '#27AE60',
            hat: null,
            accent: '#A9DFBF',
        },
        theme: {
            bgType: 'space',
            bgImage: '/bg-blackhole.jpg',
            stairType: 'neon',
            bg: { h: 140, s: 50, l: 8 },
            stair: '#2F855A',
            stairNext: '#48BB78',
            stairVisited: '#9F7AEA',
        }
    },
    {
        id: 'vampire',
        name: '흡혈귀',
        description: '어둠의 흡혈귀',
        unlockScore: 0,
        colors: {
            body: '#1A1A1A',
            bodyDark: '#000000',
            head: '#F0F0F0',
            headOutline: '#CCCCCC',
            eye: '#FF0000',
            eyeWhite: '#FFFFFF',
            feet: '#000000',
            hat: '#8E44AD',
            accent: '#333333',
        },
        theme: {
            bgType: 'night',
            bgImage: '/bg-vampire.png',
            stairType: 'gothic',
            bg: { h: 260, s: 40, l: 8 },
            stair: '#2D3748',
            stairNext: '#4A5568',
            stairVisited: '#E53E3E',
        }
    },
    {
        id: 'hero',
        name: '영웅',
        description: '정의의 영웅',
        unlockScore: 0,
        colors: {
            body: '#3498DB',
            bodyDark: '#2980B9',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#333333',
            eyeWhite: '#FFFFFF',
            feet: '#E74C3C',
            hat: null,
            accent: '#F1C40F',
        },
        theme: {
            bgType: 'city',
            bgImage: '/bg-hero.jpg',
            stairType: 'glass',
            bg: { h: 200, s: 70, l: 20 },
            stair: '#3182CE',
            stairNext: '#63B3ED',
            stairVisited: '#F6E05E',
        }
    },
    {
        id: 'king',
        name: '임금님',
        description: '위대한 임금님',
        unlockScore: 0,
        colors: {
            body: '#9B59B6',
            bodyDark: '#8E44AD',
            head: '#FFD5A0',
            headOutline: '#E0B080',
            eye: '#333333',
            eyeWhite: '#FFFFFF',
            feet: '#333333',
            hat: '#F1C40F',
            accent: '#8E44AD',
        },
        theme: {
            bgType: 'palace',
            stairType: 'gold',
            bg: { h: 45, s: 80, l: 15 },
            stair: '#B7791F',
            stairNext: '#D69E2E',
            stairVisited: '#805AD5',
        }
    },
];

export function drawCharacter(ctx, x, y, character, direction, frame, scale = 1) {
    const c = character.colors;
    const s = scale;
    const bounce = Math.sin(frame * 0.3) * 2 * s;
    const legSwing = Math.sin(frame * 0.6) * 3 * s;

    ctx.save();
    ctx.translate(x, y + bounce);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 16 * s, 10 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = c.feet;
    // Left leg
    ctx.fillRect(-6 * s - legSwing * 0.5, 8 * s, 4 * s, 8 * s);
    // Right leg
    ctx.fillRect(2 * s + legSwing * 0.5, 8 * s, 4 * s, 8 * s);

    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.roundRect(-8 * s, -8 * s, 16 * s, 18 * s, 3 * s);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.roundRect(-6 * s, -6 * s, 6 * s, 14 * s, 2 * s);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body outline
    ctx.strokeStyle = c.bodyDark;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.roundRect(-8 * s, -8 * s, 16 * s, 18 * s, 3 * s);
    ctx.stroke();

    // Head
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.arc(0, -14 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.headOutline;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    // Hat (if applicable)
    if (c.hat) {
        if (character.id === 'ninja') {
            // Headband
            ctx.fillStyle = c.hat;
            ctx.fillRect(-10 * s, -17 * s, 20 * s, 4 * s);
            // Tail
            ctx.beginPath();
            ctx.moveTo(direction > 0 ? -10 * s : 10 * s, -16 * s);
            ctx.lineTo(direction > 0 ? -18 * s : 18 * s, -20 * s + bounce);
            ctx.lineTo(direction > 0 ? -15 * s : 15 * s, -14 * s);
            ctx.fillStyle = c.hat;
            ctx.fill();
        } else if (character.id === 'princess') {
            // Crown
            ctx.fillStyle = c.hat;
            ctx.beginPath();
            ctx.moveTo(-7 * s, -22 * s);
            ctx.lineTo(-5 * s, -28 * s);
            ctx.lineTo(-2 * s, -23 * s);
            ctx.lineTo(0, -30 * s);
            ctx.lineTo(2 * s, -23 * s);
            ctx.lineTo(5 * s, -28 * s);
            ctx.lineTo(7 * s, -22 * s);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#CC9900';
            ctx.lineWidth = 1 * s;
            ctx.stroke();
            // Jewel
            ctx.fillStyle = '#FF0066';
            ctx.beginPath();
            ctx.arc(0, -26 * s, 2 * s, 0, Math.PI * 2);
            ctx.fill();
        } else if (character.id === 'robot') {
            // Antenna
            ctx.strokeStyle = '#606070';
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            ctx.moveTo(0, -23 * s);
            ctx.lineTo(0, -30 * s);
            ctx.stroke();
            ctx.fillStyle = c.hat;
            ctx.beginPath();
            ctx.arc(0, -31 * s, 3 * s, 0, Math.PI * 2);
            ctx.fill();
            // Blinking light
            if (Math.floor(frame / 10) % 2 === 0) {
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath();
                ctx.arc(0, -31 * s, 2 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (character.id === 'viking') {
            // Helmet with horns
            ctx.fillStyle = c.hat;
            ctx.beginPath();
            ctx.arc(0, -17 * s, 9 * s, Math.PI, 0);
            ctx.fill();
            // Horns
            ctx.fillStyle = '#FFFFFF';
            // Left horn
            ctx.beginPath();
            ctx.moveTo(-7 * s, -18 * s);
            ctx.quadraticCurveTo(-15 * s, -25 * s, -12 * s, -30 * s);
            ctx.quadraticCurveTo(-10 * s, -22 * s, -4 * s, -18 * s);
            ctx.fill();
            // Right horn
            ctx.beginPath();
            ctx.moveTo(7 * s, -18 * s);
            ctx.quadraticCurveTo(15 * s, -25 * s, 12 * s, -30 * s);
            ctx.quadraticCurveTo(10 * s, -22 * s, 4 * s, -18 * s);
            ctx.fill();
        } else if (character.id === 'chef') {
            // High chef hat
            ctx.fillStyle = c.hat;
            ctx.beginPath();
            ctx.roundRect(-8 * s, -35 * s, 16 * s, 15 * s, { tl: 5, tr: 5, bl: 2, br: 2 });
            ctx.fill();
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1 * s;
            ctx.stroke();
            // Hat band
            ctx.fillStyle = '#CCCCCC';
            ctx.fillRect(-8 * s, -22 * s, 16 * s, 3 * s);
        } else if (character.id === 'king') {
            // Royal crown
            ctx.fillStyle = c.hat;
            ctx.beginPath();
            ctx.moveTo(-8 * s, -22 * s);
            ctx.lineTo(-10 * s, -32 * s);
            ctx.lineTo(-4 * s, -25 * s);
            ctx.lineTo(0 * s, -35 * s);
            ctx.lineTo(4 * s, -25 * s);
            ctx.lineTo(10 * s, -32 * s);
            ctx.lineTo(8 * s, -22 * s);
            ctx.closePath();
            ctx.fill();
            // Jewels
            ctx.fillStyle = '#E74C3C';
            ctx.beginPath();
            ctx.arc(0, -28 * s, 1.5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3498DB';
            ctx.beginPath();
            ctx.arc(-5 * s, -24 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.arc(5 * s, -24 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Vampire / Hero Cape
    if (character.id === 'vampire' || character.id === 'hero') {
        ctx.fillStyle = character.id === 'vampire' ? '#660000' : '#E74C3C';
        const capeSwing = Math.sin(frame * 0.2) * 5 * s;
        ctx.beginPath();
        const capeX = direction > 0 ? -6 * s : 6 * s;
        ctx.moveTo(capeX, -5 * s);
        ctx.quadraticCurveTo(direction > 0 ? -20 * s + capeSwing : 20 * s - capeSwing, 0, capeX - (direction * 5 * s), 20 * s + capeSwing);
        ctx.lineTo(capeX + (direction * 10 * s), 20 * s);
        ctx.quadraticCurveTo(direction > 0 ? -5 * s : 5 * s, 10 * s, capeX, -5 * s);
        ctx.fill();
    }

    // Eyes
    const eyeOffsetX = direction * 2 * s;
    // Eye whites
    ctx.fillStyle = c.eyeWhite;
    ctx.beginPath();
    const eyeSizeW = character.id === 'alien' ? 4.5 * s : 3 * s;
    const eyeSizeH = character.id === 'alien' ? 6 * s : 3.5 * s;
    const eyeRot = character.id === 'alien' ? (direction * 0.2) : 0;

    ctx.ellipse(-3 * s + eyeOffsetX, -15 * s, eyeSizeW, eyeSizeH, eyeRot, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4 * s + eyeOffsetX, -15 * s, eyeSizeW, eyeSizeH, -eyeRot, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    const pupilSize = character.id === 'alien' ? 0.5 * s : 2 * s;
    ctx.arc(-2 * s + eyeOffsetX, -15 * s, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 * s + eyeOffsetX, -15 * s, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    if (character.id !== 'alien') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-1 * s + eyeOffsetX, -16 * s, 0.8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6 * s + eyeOffsetX, -16 * s, 0.8 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mouth - cute smile
    ctx.strokeStyle = '#CC8866';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(1 * s + eyeOffsetX * 0.5, -10 * s, 3 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Arms
    ctx.fillStyle = c.body;
    const armSwing = Math.sin(frame * 0.6) * 15;
    // Left arm
    ctx.save();
    ctx.translate(-8 * s, -4 * s);
    ctx.rotate((-20 + armSwing) * Math.PI / 180);
    ctx.fillRect(-3 * s, 0, 4 * s, 10 * s);
    ctx.restore();
    // Right arm
    ctx.save();
    ctx.translate(8 * s, -4 * s);
    ctx.rotate((20 - armSwing) * Math.PI / 180);
    ctx.fillRect(-1 * s, 0, 4 * s, 10 * s);
    ctx.restore();

    ctx.restore();
}

export function getUnlockedCharacters(highScore) {
    return CHARACTERS.filter(c => highScore >= c.unlockScore);
}

export function getLockedCharacters(highScore) {
    return CHARACTERS.filter(c => highScore < c.unlockScore);
}

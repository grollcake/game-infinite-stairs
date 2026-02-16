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
        }
    },
    {
        id: 'ninja',
        name: '닌자',
        description: '100점 달성 시 해금',
        unlockScore: 100,
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
        }
    },
    {
        id: 'princess',
        name: '공주',
        description: '300점 달성 시 해금',
        unlockScore: 300,
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
        }
    },
    {
        id: 'robot',
        name: '로봇',
        description: '500점 달성 시 해금',
        unlockScore: 500,
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
        }
    }

    // Eyes
    const eyeOffsetX = direction * 2 * s;
    // Eye whites
    ctx.fillStyle = c.eyeWhite;
    ctx.beginPath();
    ctx.ellipse(-3 * s + eyeOffsetX, -15 * s, 3 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4 * s + eyeOffsetX, -15 * s, 3 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(-2 * s + eyeOffsetX, -15 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 * s + eyeOffsetX, -15 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-1 * s + eyeOffsetX, -16 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6 * s + eyeOffsetX, -16 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();

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

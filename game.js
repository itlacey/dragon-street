// ============================================================
//  DRAGON STREET - A Beat-Em-Up Game
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ---- Input ----
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ---- Game State ----
let gameState = 'title'; // title, playing, levelClear, gameOver, victory
let level = 1;
let maxLevel = 5;
let score = 0;
let screenShake = 0;
let screenFlash = 0;
let particles = [];
let enemies = [];
let projectiles = [];
let pickups = [];
let levelTimer = 0;
let enemiesDefeated = 0;
let enemiesRequired = 0;
let spawnTimer = 0;
let totalSpawned = 0;
let levelTransitionTimer = 0;
let comboCount = 0;
let comboTimer = 0;
let hitstopFrames = 0;

// ---- Level Definitions ----
const LEVELS = [
    { name: "CITY STREETS", enemies: 8,  bg: 'city',    bossHP: 0,   spawnRate: 120, types: ['grunt'] },
    { name: "DARK ALLEY",   enemies: 12, bg: 'alley',   bossHP: 0,   spawnRate: 100, types: ['grunt', 'brute'] },
    { name: "ROOFTOPS",     enemies: 15, bg: 'rooftop', bossHP: 0,   spawnRate: 80,  types: ['grunt', 'brute', 'ninja'] },
    { name: "THE DOJO",     enemies: 18, bg: 'dojo',    bossHP: 0,   spawnRate: 70,  types: ['brute', 'ninja', 'ki_user'] },
    { name: "FINAL BATTLE", enemies: 10, bg: 'arena',   bossHP: 200, spawnRate: 90,  types: ['ninja', 'ki_user'] },
];

// ---- Player ----
const player = {
    x: 200, y: 340, z: 0,
    w: 48, h: 64,
    vx: 0, vy: 0, vz: 0,
    speed: 3.5,
    hp: 100, maxHP: 100,
    energy: 50, maxEnergy: 100,
    lives: 3,
    facing: 1, // 1 = right, -1 = left
    state: 'idle', // idle, walk, punch, kick, special, hurt, jump, jumpkick
    frame: 0,
    attackTimer: 0,
    hurtTimer: 0,
    invincible: 0,
    punchCombo: 0,
    comboWindow: 0,
    jumpKickHit: false,
};

// ---- Colors / Palettes ----
const COLORS = {
    playerBody: '#FF8800',
    playerOutline: '#CC5500',
    playerHair: '#FFD700',
    playerPants: '#2244AA',
    playerBelt: '#8B0000',
    grunt: '#556677',
    gruntOutline: '#334455',
    brute: '#884422',
    bruteOutline: '#662211',
    ninja: '#222244',
    ninjaOutline: '#111133',
    ki_user: '#664488',
    ki_userOutline: '#442266',
    boss: '#880000',
    bossOutline: '#550000',
    energyBlast: '#44CCFF',
    kiBlast: '#FF4444',
};

// ---- Particle System ----
function spawnParticle(x, y, type, count) {
    for (let i = 0; i < count; i++) {
        let p = { x, y, life: 1, type };
        switch (type) {
            case 'hit':
                p.vx = (Math.random() - 0.5) * 8;
                p.vy = (Math.random() - 0.5) * 8;
                p.size = 3 + Math.random() * 5;
                p.color = ['#FFAA00', '#FF6600', '#FFDD00', '#FFFFFF'][Math.floor(Math.random() * 4)];
                p.decay = 0.04 + Math.random() * 0.03;
                break;
            case 'energy':
                p.vx = (Math.random() - 0.5) * 4;
                p.vy = (Math.random() - 0.5) * 4;
                p.size = 2 + Math.random() * 4;
                p.color = ['#44CCFF', '#88EEFF', '#FFFFFF'][Math.floor(Math.random() * 3)];
                p.decay = 0.03;
                break;
            case 'dust':
                p.vx = (Math.random() - 0.5) * 3;
                p.vy = -Math.random() * 2;
                p.size = 2 + Math.random() * 3;
                p.color = '#998877';
                p.decay = 0.02;
                break;
            case 'ki':
                p.vx = (Math.random() - 0.5) * 6;
                p.vy = (Math.random() - 0.5) * 6;
                p.size = 4 + Math.random() * 6;
                p.color = ['#FF4444', '#FF8800', '#FFDD00'][Math.floor(Math.random() * 3)];
                p.decay = 0.05;
                break;
            case 'levelup':
                p.vx = (Math.random() - 0.5) * 10;
                p.vy = -2 - Math.random() * 6;
                p.size = 3 + Math.random() * 5;
                p.color = ['#FFD700', '#FF6600', '#FF0000', '#FFFFFF'][Math.floor(Math.random() * 4)];
                p.decay = 0.01 + Math.random() * 0.01;
                break;
            case 'death':
                p.vx = (Math.random() - 0.5) * 12;
                p.vy = (Math.random() - 0.5) * 12;
                p.size = 4 + Math.random() * 8;
                p.color = ['#FF0000', '#FF4400', '#FF8800', '#FFCC00'][Math.floor(Math.random() * 4)];
                p.decay = 0.02;
                break;
        }
        particles.push(p);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.97;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ---- Draw Character (Pixel Art Style) ----
function drawCharacter(x, y, z, w, h, facing, colors, state, frame, isPlayer, type) {
    let drawY = y - z;
    ctx.save();
    ctx.translate(x, drawY);
    if (facing === -1) ctx.scale(-1, 1);

    let bodyColor = colors.body;
    let outlineColor = colors.outline;
    let bobY = 0;

    if (state === 'walk') bobY = Math.sin(frame * 0.3) * 2;
    if (state === 'hurt') {
        bodyColor = '#FFFFFF';
        bobY = Math.sin(frame * 2) * 3;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 2, w / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    let punchExtend = 0;
    let kickExtend = 0;
    let jumpOffset = 0;
    if (state === 'punch') punchExtend = Math.sin(frame * 0.5) * 20;
    if (state === 'kick') kickExtend = Math.sin(frame * 0.4) * 24;
    if (state === 'special') punchExtend = 10;
    if (state === 'jump' || state === 'jumpkick') jumpOffset = 0; // z handles this
    if (state === 'jumpkick') kickExtend = 18;

    // Legs
    ctx.fillStyle = isPlayer ? COLORS.playerPants : bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    let legSpread = state === 'walk' ? Math.sin(frame * 0.3) * 8 : 4;
    let kickLegX = state === 'kick' || state === 'jumpkick' ? kickExtend : 0;
    // Left leg
    ctx.fillRect(-w / 4 - 4 - legSpread, h / 4 + bobY, 10, h / 3);
    ctx.strokeRect(-w / 4 - 4 - legSpread, h / 4 + bobY, 10, h / 3);
    // Right leg (kick extends forward)
    ctx.fillRect(w / 4 - 6 + legSpread + kickLegX * 0.3, h / 4 + bobY - (kickLegX > 0 ? 8 : 0), 10, h / 3);
    ctx.strokeRect(w / 4 - 6 + legSpread + kickLegX * 0.3, h / 4 + bobY - (kickLegX > 0 ? 8 : 0), 10, h / 3);

    // Feet
    ctx.fillStyle = '#333';
    ctx.fillRect(-w / 4 - 4 - legSpread, h / 4 + h / 3 - 4 + bobY, 12, 6);
    ctx.fillRect(w / 4 - 6 + legSpread + kickLegX * 0.3, h / 4 + h / 3 - 4 + bobY - (kickLegX > 0 ? 8 : 0), 12, 6);

    // Body
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.fillRect(-w / 3, -h / 4 + bobY, w / 1.5, h / 2);
    ctx.strokeRect(-w / 3, -h / 4 + bobY, w / 1.5, h / 2);

    // Belt (player only)
    if (isPlayer) {
        ctx.fillStyle = COLORS.playerBelt;
        ctx.fillRect(-w / 3, h / 6 + bobY, w / 1.5, 5);
    }

    // Arms
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    // Back arm
    ctx.fillRect(-w / 3 - 8, -h / 6 + bobY, 10, h / 3);
    ctx.strokeRect(-w / 3 - 8, -h / 6 + bobY, 10, h / 3);
    // Front arm (punch extends forward)
    let armX = w / 3 - 2 + punchExtend * 0.6;
    let armY = -h / 6 + bobY - (punchExtend > 5 ? 4 : 0);
    ctx.fillRect(armX, armY, 10, h / 3 - (punchExtend > 5 ? 6 : 0));
    ctx.strokeRect(armX, armY, 10, h / 3 - (punchExtend > 5 ? 6 : 0));

    // Fist (when punching)
    if (punchExtend > 5) {
        ctx.fillStyle = isPlayer ? '#FFCC88' : bodyColor;
        ctx.fillRect(armX + 8, armY - 2, 10, 10);
        ctx.strokeRect(armX + 8, armY - 2, 10, 10);
    }

    // Head
    ctx.fillStyle = isPlayer ? '#FFCC88' : '#DDBB99';
    ctx.strokeStyle = outlineColor;
    ctx.beginPath();
    ctx.arc(0, -h / 3 + bobY, w / 4 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair (player gets spiky DBZ hair)
    if (isPlayer) {
        ctx.fillStyle = COLORS.playerHair;
        ctx.strokeStyle = '#CC9900';
        ctx.lineWidth = 1;
        // Spiky hair
        let hx = 0, hy = -h / 3 + bobY;
        ctx.beginPath();
        ctx.moveTo(hx - 12, hy - 4);
        ctx.lineTo(hx - 8, hy - 28);
        ctx.lineTo(hx - 2, hy - 10);
        ctx.lineTo(hx + 4, hy - 32);
        ctx.lineTo(hx + 8, hy - 12);
        ctx.lineTo(hx + 14, hy - 26);
        ctx.lineTo(hx + 16, hy - 6);
        ctx.lineTo(hx + 12, hy);
        ctx.lineTo(hx - 12, hy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (type === 'boss') {
        // Boss gets horns
        ctx.fillStyle = '#880000';
        let hy = -h / 3 + bobY;
        ctx.beginPath();
        ctx.moveTo(-10, hy - 10);
        ctx.lineTo(-16, hy - 30);
        ctx.lineTo(-4, hy - 12);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, hy - 10);
        ctx.lineTo(16, hy - 30);
        ctx.lineTo(4, hy - 12);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'ninja') {
        // Ninja mask
        ctx.fillStyle = '#111';
        ctx.fillRect(-14, -h / 3 + bobY - 4, 28, 8);
    } else if (type === 'brute') {
        // Brute has a mohawk
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(-3, -h / 3 + bobY - 20, 6, 16);
    }

    // Eyes
    let eyeY = -h / 3 + bobY + 2;
    ctx.fillStyle = '#FFF';
    ctx.fillRect(4, eyeY - 3, 6, 5);
    ctx.fillRect(-10, eyeY - 3, 6, 5);
    ctx.fillStyle = state === 'hurt' ? '#FF0000' : '#000';
    ctx.fillRect(6, eyeY - 2, 3, 3);
    ctx.fillRect(-8, eyeY - 2, 3, 3);

    // Angry eyebrows when attacking
    if (state === 'punch' || state === 'kick' || state === 'special' || state === 'jumpkick') {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, eyeY - 6);
        ctx.lineTo(-4, eyeY - 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, eyeY - 4);
        ctx.lineTo(10, eyeY - 6);
        ctx.stroke();
    }

    // Energy aura (when doing special)
    if (state === 'special') {
        ctx.strokeStyle = COLORS.energyBlast;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.5) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, w + 10, h / 1.5 + 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// ---- Enemy Factory ----
function createEnemy(type, x, y) {
    let e = {
        type, x, y, z: 0,
        w: 44, h: 60,
        vx: 0, vy: 0, vz: 0,
        facing: -1,
        state: 'idle',
        frame: 0,
        attackTimer: 0,
        hurtTimer: 0,
        aiTimer: Math.random() * 60,
        aiState: 'approach',
    };
    switch (type) {
        case 'grunt':
            e.hp = 20; e.maxHP = 20; e.speed = 1.5; e.damage = 5; e.score = 100;
            break;
        case 'brute':
            e.hp = 40; e.maxHP = 40; e.speed = 1; e.damage = 10; e.score = 200;
            e.w = 54; e.h = 70;
            break;
        case 'ninja':
            e.hp = 25; e.maxHP = 25; e.speed = 2.5; e.damage = 8; e.score = 250;
            e.w = 40; e.h = 56;
            break;
        case 'ki_user':
            e.hp = 30; e.maxHP = 30; e.speed = 1.5; e.damage = 12; e.score = 300;
            e.shootTimer = 0;
            break;
        case 'boss':
            e.hp = LEVELS[level - 1].bossHP || 200;
            e.maxHP = e.hp;
            e.speed = 1.8; e.damage = 15; e.score = 1000;
            e.w = 64; e.h = 80;
            e.shootTimer = 0;
            break;
    }
    return e;
}

// ---- Projectile Factory ----
function createProjectile(x, y, dir, type, fromPlayer) {
    return {
        x, y, vx: dir * (type === 'energy' ? 8 : 5),
        w: type === 'energy' ? 24 : 16,
        h: type === 'energy' ? 16 : 12,
        type, fromPlayer,
        damage: fromPlayer ? 20 : 10,
        life: 80,
        frame: 0,
    };
}

// ---- Collision ----
function boxOverlap(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
           Math.abs(a.y - b.y) < (a.h + b.h) / 3;
}

function attackHitbox(entity, range) {
    return {
        x: entity.x + entity.facing * range / 2,
        y: entity.y,
        w: range,
        h: entity.h * 0.6,
    };
}

// ---- Backgrounds ----
function drawBackground() {
    let lvl = LEVELS[level - 1];
    let gradient;

    switch (lvl.bg) {
        case 'city':
            // Sky
            gradient = ctx.createLinearGradient(0, 0, 0, H);
            gradient.addColorStop(0, '#1a1a3a');
            gradient.addColorStop(0.5, '#2a2a5a');
            gradient.addColorStop(1, '#0a0a2a');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, W, H);
            // Stars
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 30; i++) {
                let sx = (i * 137 + 50) % W;
                let sy = (i * 97 + 20) % (H * 0.4);
                ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
            }
            // Buildings
            ctx.fillStyle = '#111122';
            for (let i = 0; i < 8; i++) {
                let bh = 120 + (i * 47) % 80;
                let bx = i * 130 - 20;
                let bw = 90 + (i * 23) % 40;
                ctx.fillRect(bx, H - 200 - bh, bw, bh + 200);
                // Windows
                ctx.fillStyle = (i + Math.floor(levelTimer / 120)) % 3 === 0 ? '#FFDD44' : '#222233';
                for (let wy = 0; wy < bh - 10; wy += 20) {
                    for (let wx = 8; wx < bw - 8; wx += 16) {
                        ctx.fillRect(bx + wx, H - 200 - bh + wy + 8, 8, 12);
                    }
                }
                ctx.fillStyle = '#111122';
            }
            // Ground
            ctx.fillStyle = '#333344';
            ctx.fillRect(0, H - 200, W, 200);
            ctx.fillStyle = '#444455';
            ctx.fillRect(0, H - 200, W, 4);
            // Road lines
            ctx.fillStyle = '#555533';
            for (let i = 0; i < 10; i++) {
                ctx.fillRect(i * 120 + (levelTimer * 0.5) % 120 - 60, H - 120, 40, 4);
            }
            break;

        case 'alley':
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, W, H);
            // Walls
            ctx.fillStyle = '#1a1a22';
            ctx.fillRect(0, 0, W, H - 220);
            // Brick pattern
            ctx.fillStyle = '#222230';
            for (let by = 0; by < H - 220; by += 16) {
                let offset = (by / 16) % 2 === 0 ? 0 : 20;
                for (let bx = offset; bx < W; bx += 40) {
                    ctx.fillRect(bx + 1, by + 1, 38, 14);
                }
            }
            // Flickering light
            if (Math.sin(levelTimer * 0.1) > -0.3) {
                ctx.fillStyle = 'rgba(255,200,100,0.1)';
                ctx.beginPath();
                ctx.arc(480, 100, 200, 0, Math.PI * 2);
                ctx.fill();
            }
            // Ground
            ctx.fillStyle = '#222233';
            ctx.fillRect(0, H - 200, W, 200);
            // Puddles
            ctx.fillStyle = 'rgba(50,50,80,0.5)';
            ctx.beginPath();
            ctx.ellipse(300, H - 130, 60, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(700, H - 100, 40, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'rooftop':
            gradient = ctx.createLinearGradient(0, 0, 0, H);
            gradient.addColorStop(0, '#FF4400');
            gradient.addColorStop(0.3, '#FF8800');
            gradient.addColorStop(0.6, '#CC3300');
            gradient.addColorStop(1, '#441100');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, W, H);
            // Sun
            ctx.fillStyle = '#FFCC00';
            ctx.beginPath();
            ctx.arc(750, 120, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,200,0,0.2)';
            ctx.beginPath();
            ctx.arc(750, 120, 100, 0, Math.PI * 2);
            ctx.fill();
            // Distant buildings
            ctx.fillStyle = '#220000';
            for (let i = 0; i < 12; i++) {
                let bh = 50 + (i * 37) % 60;
                ctx.fillRect(i * 85 - 10, H - 200 - bh * 0.4, 70, bh + 100);
            }
            // Rooftop ground
            ctx.fillStyle = '#553322';
            ctx.fillRect(0, H - 200, W, 200);
            ctx.fillStyle = '#664433';
            ctx.fillRect(0, H - 200, W, 6);
            // AC units
            ctx.fillStyle = '#444433';
            ctx.fillRect(100, H - 240, 50, 40);
            ctx.fillRect(700, H - 230, 40, 30);
            break;

        case 'dojo':
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(0, 0, W, H);
            // Wooden walls
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(0, 0, W, H - 220);
            // Wall details
            for (let wx = 0; wx < W; wx += 80) {
                ctx.fillStyle = '#2a1a0a';
                ctx.fillRect(wx, 0, 3, H - 220);
            }
            // Banners
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(200, 30, 40, 100);
            ctx.fillRect(720, 30, 40, 100);
            // Dragon symbols on banners
            ctx.fillStyle = '#FFD700';
            ctx.font = '28px serif';
            ctx.fillText('龍', 205, 90);
            ctx.fillText('龍', 725, 90);
            // Wooden floor
            ctx.fillStyle = '#5a4a2a';
            ctx.fillRect(0, H - 200, W, 200);
            for (let fx = 0; fx < W; fx += 60) {
                ctx.fillStyle = '#4a3a1a';
                ctx.fillRect(fx, H - 200, 2, 200);
            }
            break;

        case 'arena':
            // Epic sky
            gradient = ctx.createLinearGradient(0, 0, 0, H);
            gradient.addColorStop(0, '#000022');
            gradient.addColorStop(0.4, '#220044');
            gradient.addColorStop(0.7, '#440022');
            gradient.addColorStop(1, '#220000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, W, H);
            // Energy in sky
            for (let i = 0; i < 5; i++) {
                let ex = (i * 200 + levelTimer * 2) % (W + 200) - 100;
                let ey = 50 + Math.sin(levelTimer * 0.02 + i) * 30;
                ctx.strokeStyle = `rgba(${100 + i * 30}, ${50 + i * 20}, 255, 0.3)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ex, ey, 20 + Math.sin(levelTimer * 0.05 + i) * 10, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Arena floor
            gradient = ctx.createLinearGradient(0, H - 200, 0, H);
            gradient.addColorStop(0, '#333355');
            gradient.addColorStop(1, '#111133');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, H - 200, W, 200);
            // Floor circle
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(W / 2, H - 100, 300, 40, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }
}

// ---- Draw HUD ----
function drawHUD() {
    // HP Bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(15, 12, 204, 24);
    ctx.fillStyle = player.hp > 30 ? '#00CC00' : '#CC0000';
    ctx.fillRect(17, 14, (player.hp / player.maxHP) * 200, 20);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 12, 204, 24);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('HP', 20, 28);

    // Energy Bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(15, 40, 154, 16);
    ctx.fillStyle = '#4488FF';
    ctx.fillRect(17, 42, (player.energy / player.maxEnergy) * 150, 12);
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(15, 40, 154, 16);
    ctx.fillStyle = '#AAF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('KI', 20, 52);

    // Lives
    for (let i = 0; i < player.lives; i++) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(240 + i * 25, 24, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText('★', 236 + i * 25, 28);
    }

    // Score
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SCORE: ' + score.toString().padStart(8, '0'), W - 20, 28);
    ctx.textAlign = 'left';

    // Level
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + level + ' - ' + LEVELS[level - 1].name, W / 2, 24);
    ctx.textAlign = 'left';

    // Enemies remaining
    ctx.fillStyle = '#FF4444';
    ctx.font = '12px monospace';
    let remaining = enemiesRequired - enemiesDefeated;
    ctx.fillText('ENEMIES: ' + Math.max(0, remaining), 15, 72);

    // Combo
    if (comboCount > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold ' + Math.min(24 + comboCount * 2, 40) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(comboTimer / 30, 1);
        ctx.fillText(comboCount + ' HIT COMBO!', W / 2, 100);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    // Boss HP bar
    for (let e of enemies) {
        if (e.type === 'boss') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(W / 2 - 152, H - 40, 304, 24);
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(W / 2 - 150, H - 38, (e.hp / e.maxHP) * 300, 20);
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(W / 2 - 152, H - 40, 304, 24);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', W / 2, H - 24);
            ctx.textAlign = 'left';
        }
    }
}

// ---- Player Update ----
function updatePlayer() {
    if (player.state === 'hurt') {
        player.hurtTimer--;
        player.x += player.vx;
        player.vx *= 0.85;
        if (player.hurtTimer <= 0) {
            player.state = 'idle';
            player.invincible = 60;
        }
        player.frame++;
        return;
    }

    if (player.invincible > 0) player.invincible--;
    if (player.comboWindow > 0) player.comboWindow--;
    if (player.attackTimer > 0) {
        player.attackTimer--;
        player.frame++;
        // Check attack hits
        if (player.attackTimer === (player.state === 'kick' ? 10 : player.state === 'jumpkick' ? 8 : 8)) {
            let range = player.state === 'kick' || player.state === 'jumpkick' ? 60 : 50;
            let hitbox = attackHitbox(player, range);
            let damage = player.state === 'kick' ? 12 : player.state === 'jumpkick' ? 15 : (8 + player.punchCombo * 3);
            for (let e of enemies) {
                if (e.state !== 'dead' && boxOverlap(hitbox, e)) {
                    hurtEnemy(e, damage, player.facing);
                }
            }
        }
        if (player.attackTimer <= 0) {
            if (player.state === 'jump' || player.state === 'jumpkick') {
                // Stay in jump
            } else {
                player.state = 'idle';
                player.comboWindow = 20;
            }
        }
        if (player.z <= 0 && (player.state === 'jump' || player.state === 'jumpkick')) {
            player.state = 'idle';
            player.attackTimer = 0;
        }
        return;
    }

    // Movement
    let moving = false;
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['a']) { dx = -1; player.facing = -1; }
    if (keys['ArrowRight'] || keys['d']) { dx = 1; player.facing = 1; }
    if (keys['ArrowUp'] || keys['w']) { dy = -1; }
    if (keys['ArrowDown'] || keys['s']) { dy = 1; }

    if (dx || dy) {
        let mag = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / mag) * player.speed;
        player.y += (dy / mag) * player.speed;
        moving = true;
    }

    // Jump
    if ((keys[' '] || keys['ArrowUp'] && keys['w']) && player.z === 0) {
        player.vz = 8;
        player.state = 'jump';
        spawnParticle(player.x, player.y + player.h / 2, 'dust', 3);
    }

    // Apply jump physics
    if (player.z > 0 || player.vz > 0) {
        player.z += player.vz;
        player.vz -= 0.4;
        if (player.z <= 0) {
            player.z = 0;
            player.vz = 0;
            if (player.state === 'jump' || player.state === 'jumpkick') {
                player.state = 'idle';
                player.attackTimer = 0;
                spawnParticle(player.x, player.y + player.h / 2, 'dust', 4);
            }
        }
    }

    // Attacks
    if (keys['j'] || keys['z']) {
        if (player.z > 0) {
            player.state = 'jumpkick';
            player.attackTimer = 15;
            player.jumpKickHit = false;
        } else {
            player.state = 'punch';
            player.attackTimer = 14;
            if (player.comboWindow > 0) {
                player.punchCombo = Math.min(player.punchCombo + 1, 3);
            } else {
                player.punchCombo = 0;
            }
        }
        player.frame = 0;
        keys['j'] = false;
        keys['z'] = false;
    }

    if (keys['k'] || keys['x']) {
        if (player.z > 0) {
            player.state = 'jumpkick';
            player.attackTimer = 15;
        } else {
            player.state = 'kick';
            player.attackTimer = 18;
        }
        player.frame = 0;
        keys['k'] = false;
        keys['x'] = false;
    }

    // Special / Energy Blast
    if ((keys['l'] || keys['c']) && player.energy >= 25) {
        player.state = 'special';
        player.attackTimer = 20;
        player.energy -= 25;
        player.frame = 0;
        projectiles.push(createProjectile(
            player.x + player.facing * 30,
            player.y - 10,
            player.facing,
            'energy',
            true
        ));
        spawnParticle(player.x, player.y - 10, 'energy', 10);
        screenShake = 8;
        keys['l'] = false;
        keys['c'] = false;
    }

    // Bounds
    player.x = Math.max(30, Math.min(W - 30, player.x));
    player.y = Math.max(H - 200, Math.min(H - 40, player.y));

    // Regen energy slowly
    player.energy = Math.min(player.maxEnergy, player.energy + 0.03);

    if (moving && player.state === 'idle') player.state = 'walk';
    if (!moving && player.state === 'walk') player.state = 'idle';
    player.frame++;

    // Combo timer
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) comboCount = 0;
    }
}

// ---- Enemy AI ----
function updateEnemy(e) {
    if (e.state === 'dead') return;

    if (e.state === 'hurt') {
        e.hurtTimer--;
        e.x += e.vx;
        e.vx *= 0.85;
        if (e.hurtTimer <= 0) e.state = 'idle';
        e.frame++;
        return;
    }

    if (e.attackTimer > 0) {
        e.attackTimer--;
        e.frame++;
        if (e.attackTimer === 8) {
            let hitbox = attackHitbox(e, 50);
            if (boxOverlap(hitbox, player) && player.invincible <= 0 && player.state !== 'hurt') {
                hurtPlayer(e.damage, e.facing);
            }
        }
        if (e.attackTimer <= 0) e.state = 'idle';
        return;
    }

    e.aiTimer--;
    if (e.aiTimer <= 0) {
        e.aiTimer = 30 + Math.random() * 40;
        let dist = Math.abs(e.x - player.x);
        if (dist < 60 && Math.abs(e.y - player.y) < 30) {
            e.aiState = 'attack';
        } else if (dist > 300) {
            e.aiState = 'approach';
        } else {
            e.aiState = Math.random() > 0.4 ? 'approach' : 'circle';
        }
    }

    e.facing = player.x > e.x ? 1 : -1;

    switch (e.aiState) {
        case 'approach':
            let dx = player.x - e.x;
            let dy = player.y - e.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
                e.state = 'walk';
            }
            if (dist < 55 && Math.abs(dy) < 25) {
                e.state = Math.random() > 0.5 ? 'punch' : 'kick';
                e.attackTimer = 20;
                e.frame = 0;
            }
            break;

        case 'circle':
            let angle = Math.atan2(player.y - e.y, player.x - e.x);
            angle += Math.PI / 2;
            e.x += Math.cos(angle) * e.speed * 0.7;
            e.y += Math.sin(angle) * e.speed * 0.7;
            e.state = 'walk';
            break;

        case 'attack':
            e.state = Math.random() > 0.5 ? 'punch' : 'kick';
            e.attackTimer = 22;
            e.frame = 0;
            e.aiState = 'approach';
            break;
    }

    // Ki user shoots
    if (e.type === 'ki_user' || e.type === 'boss') {
        if (e.shootTimer !== undefined) {
            e.shootTimer++;
            let shootInterval = e.type === 'boss' ? 80 : 120;
            if (e.shootTimer > shootInterval && Math.abs(e.y - player.y) < 40) {
                e.shootTimer = 0;
                projectiles.push(createProjectile(
                    e.x + e.facing * 25, e.y - 10,
                    e.facing, 'ki', false
                ));
                spawnParticle(e.x + e.facing * 25, e.y - 10, 'ki', 5);
            }
        }
    }

    // Bounds
    e.x = Math.max(30, Math.min(W - 30, e.x));
    e.y = Math.max(H - 200, Math.min(H - 40, e.y));
    e.frame++;
}

// ---- Hurt Functions ----
function hurtEnemy(e, damage, knockDir) {
    e.hp -= damage;
    e.state = 'hurt';
    e.hurtTimer = 15;
    e.vx = knockDir * 6;
    spawnParticle(e.x, e.y - e.h / 3, 'hit', 8);
    screenShake = 4;
    hitstopFrames = 3;
    comboCount++;
    comboTimer = 90;
    score += 10 * comboCount;

    if (e.hp <= 0) {
        e.state = 'dead';
        enemiesDefeated++;
        score += e.score + comboCount * 50;
        spawnParticle(e.x, e.y, 'death', 20);
        screenShake = 8;
        // Drop pickup chance
        if (Math.random() < 0.25) {
            pickups.push({
                x: e.x, y: e.y,
                type: Math.random() > 0.5 ? 'health' : 'energy',
                life: 300,
            });
        }
    }
}

function hurtPlayer(damage, knockDir) {
    player.hp -= damage;
    player.state = 'hurt';
    player.hurtTimer = 20;
    player.vx = knockDir * 5;
    spawnParticle(player.x, player.y - player.h / 3, 'hit', 6);
    screenShake = 6;

    if (player.hp <= 0) {
        player.lives--;
        if (player.lives <= 0) {
            gameState = 'gameOver';
        } else {
            player.hp = player.maxHP;
            player.energy = player.maxEnergy / 2;
            player.invincible = 120;
            player.state = 'idle';
            player.hurtTimer = 0;
        }
    }
}

// ---- Spawn Enemies ----
function spawnEnemies() {
    let lvl = LEVELS[level - 1];
    spawnTimer++;
    if (spawnTimer >= lvl.spawnRate && totalSpawned < lvl.enemies) {
        spawnTimer = 0;
        let type = lvl.types[Math.floor(Math.random() * lvl.types.length)];
        let side = Math.random() > 0.5 ? W + 40 : -40;
        let y = H - 200 + Math.random() * 140;
        enemies.push(createEnemy(type, side, y));
        totalSpawned++;
    }

    // Spawn boss in final level
    if (level === maxLevel && lvl.bossHP > 0 && totalSpawned >= lvl.enemies) {
        let hasBoss = enemies.some(e => e.type === 'boss' && e.state !== 'dead');
        let bossDefeated = enemies.some(e => e.type === 'boss' && e.state === 'dead');
        if (!hasBoss && !bossDefeated) {
            enemies.push(createEnemy('boss', W + 60, H - 130));
            screenShake = 15;
            screenFlash = 10;
        }
    }
}

// ---- Update Projectiles ----
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.life--;
        p.frame++;

        if (p.fromPlayer) {
            for (let e of enemies) {
                if (e.state !== 'dead' && Math.abs(p.x - e.x) < 30 && Math.abs(p.y - e.y) < 30) {
                    hurtEnemy(e, p.damage, Math.sign(p.vx));
                    spawnParticle(p.x, p.y, 'energy', 8);
                    p.life = 0;
                    break;
                }
            }
        } else {
            if (Math.abs(p.x - player.x) < 25 && Math.abs(p.y - player.y) < 25 && player.invincible <= 0 && player.state !== 'hurt') {
                hurtPlayer(p.damage, Math.sign(p.vx));
                spawnParticle(p.x, p.y, 'ki', 6);
                p.life = 0;
            }
        }

        if (p.life <= 0 || p.x < -50 || p.x > W + 50) {
            projectiles.splice(i, 1);
        }
    }
}

// ---- Draw Projectiles ----
function drawProjectiles() {
    for (let p of projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        let glow = p.type === 'energy' ? COLORS.energyBlast : COLORS.kiBlast;
        // Glow
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, p.w, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.5;
        for (let t = 1; t < 4; t++) {
            ctx.beginPath();
            ctx.arc(-p.vx * t * 2, Math.sin(p.frame * 0.5 + t) * 3, p.w / 3 - t, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ---- Draw Pickups ----
function updatePickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
        let pk = pickups[i];
        pk.life--;
        if (pk.life <= 0) { pickups.splice(i, 1); continue; }
        // Collect
        if (Math.abs(pk.x - player.x) < 30 && Math.abs(pk.y - player.y) < 30) {
            if (pk.type === 'health') {
                player.hp = Math.min(player.maxHP, player.hp + 25);
            } else {
                player.energy = Math.min(player.maxEnergy, player.energy + 30);
            }
            spawnParticle(pk.x, pk.y, 'energy', 8);
            score += 50;
            pickups.splice(i, 1);
        }
    }
}

function drawPickups() {
    for (let pk of pickups) {
        let bob = Math.sin(levelTimer * 0.1) * 3;
        ctx.fillStyle = pk.type === 'health' ? '#00FF00' : '#4488FF';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pk.x, pk.y - 10 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pk.type === 'health' ? '+' : 'Ki', pk.x, pk.y - 6 + bob);
        ctx.textAlign = 'left';
        // Blink when about to expire
        if (pk.life < 60 && pk.life % 10 < 5) {
            ctx.globalAlpha = 0.3;
        }
        ctx.globalAlpha = 1;
    }
}

// ---- Level Management ----
function checkLevelComplete() {
    if (enemiesDefeated >= enemiesRequired && enemies.every(e => e.state === 'dead' || e.state === undefined)) {
        if (level >= maxLevel) {
            gameState = 'victory';
        } else {
            gameState = 'levelClear';
            levelTransitionTimer = 180;
        }
    }
}

function startLevel(lvl) {
    level = lvl;
    enemies = [];
    projectiles = [];
    pickups = [];
    particles = [];
    enemiesDefeated = 0;
    enemiesRequired = LEVELS[lvl - 1].enemies + (LEVELS[lvl - 1].bossHP > 0 ? 1 : 0);
    spawnTimer = 0;
    totalSpawned = 0;
    levelTimer = 0;
    comboCount = 0;
    comboTimer = 0;
    player.x = 100;
    player.y = H - 120;
    player.z = 0;
    player.state = 'idle';
    player.hurtTimer = 0;
    player.attackTimer = 0;
    player.invincible = 60;
    gameState = 'playing';
}

function resetGame() {
    score = 0;
    player.hp = player.maxHP;
    player.energy = player.maxEnergy / 2;
    player.lives = 3;
    startLevel(1);
}

// ---- Title Screen ----
function drawTitle() {
    // Animated background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Energy lines
    for (let i = 0; i < 20; i++) {
        let x = (i * 50 + levelTimer * 3) % (W + 100) - 50;
        ctx.strokeStyle = `hsl(${(i * 20 + levelTimer) % 360}, 80%, 50%)`;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30, H);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.save();
    ctx.textAlign = 'center';

    // Shadow
    ctx.fillStyle = '#000';
    ctx.font = 'bold 72px monospace';
    ctx.fillText('DRAGON STREET', W / 2 + 3, 183);

    // Main title with gradient effect
    let titleGrad = ctx.createLinearGradient(W / 2 - 250, 140, W / 2 + 250, 200);
    titleGrad.addColorStop(0, '#FF4400');
    titleGrad.addColorStop(0.3, '#FFD700');
    titleGrad.addColorStop(0.5, '#FF8800');
    titleGrad.addColorStop(0.7, '#FFD700');
    titleGrad.addColorStop(1, '#FF4400');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 72px monospace';
    ctx.fillText('DRAGON STREET', W / 2, 180);

    // Subtitle
    ctx.fillStyle = '#AAA';
    ctx.font = '18px monospace';
    ctx.fillText('A Beat-Em-Up Fighting Game', W / 2, 220);

    // Animated character preview
    let previewY = 320;
    drawCharacter(W / 2 - 100, previewY, 0, 48, 64, 1,
        { body: COLORS.playerBody, outline: COLORS.playerOutline },
        'idle', levelTimer, true, 'player');
    drawCharacter(W / 2 + 100, previewY, 0, 44, 60, -1,
        { body: COLORS.grunt, outline: COLORS.gruntOutline },
        'idle', levelTimer, false, 'grunt');

    // VS text
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('VS', W / 2, previewY + 10);

    // Controls
    ctx.fillStyle = '#FFF';
    ctx.font = '14px monospace';
    ctx.fillText('ARROW KEYS / WASD - Move', W / 2, 420);
    ctx.fillText('Z / J - Punch    X / K - Kick', W / 2, 445);
    ctx.fillText('C / L - Energy Blast (uses Ki)', W / 2, 470);
    ctx.fillText('SPACE - Jump', W / 2, 495);

    // Start prompt
    ctx.fillStyle = Math.sin(levelTimer * 0.08) > 0 ? '#FFD700' : '#FF8800';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('PRESS ENTER TO START', W / 2, 530);

    ctx.restore();
}

// ---- Level Clear Screen ----
function drawLevelClear() {
    drawBackground();
    drawPickups();
    drawParticles();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('LEVEL CLEAR!', W / 2, H / 2 - 30);

    ctx.fillStyle = '#FFF';
    ctx.font = '20px monospace';
    ctx.fillText('Score: ' + score, W / 2, H / 2 + 20);

    ctx.fillStyle = Math.sin(levelTimer * 0.1) > 0 ? '#FFF' : '#AAA';
    ctx.font = '16px monospace';
    ctx.fillText('Get ready for Level ' + (level + 1) + '...', W / 2, H / 2 + 60);
    ctx.textAlign = 'left';

    spawnParticle(Math.random() * W, Math.random() * H, 'levelup', 1);
}

// ---- Game Over Screen ----
function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

    ctx.fillStyle = '#FFF';
    ctx.font = '24px monospace';
    ctx.fillText('Final Score: ' + score, W / 2, H / 2 + 20);

    ctx.fillStyle = Math.sin(levelTimer * 0.08) > 0 ? '#FFD700' : '#FF8800';
    ctx.font = '18px monospace';
    ctx.fillText('PRESS ENTER TO TRY AGAIN', W / 2, H / 2 + 70);
    ctx.textAlign = 'left';
}

// ---- Victory Screen ----
function drawVictory() {
    // Epic background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
        spawnParticle(Math.random() * W, Math.random() * H, 'levelup', 1);
    }
    drawParticles();

    ctx.textAlign = 'center';

    let victGrad = ctx.createLinearGradient(W / 2 - 200, H / 2 - 80, W / 2 + 200, H / 2);
    victGrad.addColorStop(0, '#FFD700');
    victGrad.addColorStop(0.5, '#FFFFFF');
    victGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = victGrad;
    ctx.font = 'bold 52px monospace';
    ctx.fillText('YOU WIN!', W / 2, H / 2 - 60);

    ctx.fillStyle = '#FF8800';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('DRAGON STREET CHAMPION', W / 2, H / 2 - 10);

    ctx.fillStyle = '#FFF';
    ctx.font = '22px monospace';
    ctx.fillText('Final Score: ' + score, W / 2, H / 2 + 40);

    ctx.fillStyle = Math.sin(levelTimer * 0.08) > 0 ? '#FFD700' : '#FF8800';
    ctx.font = '18px monospace';
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', W / 2, H / 2 + 90);
    ctx.textAlign = 'left';
}

// ---- Main Game Loop ----
function gameLoop() {
    levelTimer++;

    if (hitstopFrames > 0) {
        hitstopFrames--;
        drawFrame();
        requestAnimationFrame(gameLoop);
        return;
    }

    switch (gameState) {
        case 'title':
            if (keys['Enter']) {
                resetGame();
                keys['Enter'] = false;
            }
            break;

        case 'playing':
            updatePlayer();
            for (let e of enemies) updateEnemy(e);
            // Remove dead enemies after delay
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (enemies[i].state === 'dead') {
                    enemies[i].hurtTimer = (enemies[i].hurtTimer || 0) + 1;
                    if (enemies[i].hurtTimer > 30) enemies.splice(i, 1);
                }
            }
            updateProjectiles();
            updatePickups();
            spawnEnemies();
            checkLevelComplete();
            break;

        case 'levelClear':
            levelTransitionTimer--;
            if (levelTransitionTimer <= 0 || keys['Enter']) {
                startLevel(level + 1);
                keys['Enter'] = false;
            }
            break;

        case 'gameOver':
        case 'victory':
            if (keys['Enter']) {
                gameState = 'title';
                keys['Enter'] = false;
            }
            break;
    }

    updateParticles();
    if (screenShake > 0) screenShake *= 0.8;
    if (screenShake < 0.5) screenShake = 0;
    if (screenFlash > 0) screenFlash--;

    drawFrame();
    requestAnimationFrame(gameLoop);
}

function drawFrame() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake * 2,
            (Math.random() - 0.5) * screenShake * 2
        );
    }

    switch (gameState) {
        case 'title':
            drawTitle();
            break;

        case 'playing':
            drawBackground();

            // Sort by Y for depth
            let drawList = [{ obj: player, isPlayer: true }];
            for (let e of enemies) {
                if (e.state !== 'dead' || e.hurtTimer < 20) {
                    drawList.push({ obj: e, isPlayer: false });
                }
            }
            drawList.sort((a, b) => a.obj.y - b.obj.y);

            drawPickups();

            for (let d of drawList) {
                let o = d.obj;
                if (o === player && player.invincible > 0 && player.invincible % 6 < 3) continue;
                let colors;
                if (d.isPlayer) {
                    colors = { body: COLORS.playerBody, outline: COLORS.playerOutline };
                } else {
                    let type = o.type;
                    colors = { body: COLORS[type], outline: COLORS[type + 'Outline'] };
                }
                let alpha = 1;
                if (o.state === 'dead') alpha = Math.max(0, 1 - o.hurtTimer / 20);
                ctx.globalAlpha = alpha;
                drawCharacter(o.x, o.y, o.z || 0, o.w, o.h, o.facing, colors, o.state, o.frame, d.isPlayer, o.type);
                ctx.globalAlpha = 1;

                // Enemy HP bars
                if (!d.isPlayer && o.state !== 'dead' && o.type !== 'boss') {
                    let hpPct = o.hp / o.maxHP;
                    ctx.fillStyle = '#000';
                    ctx.fillRect(o.x - 20, o.y - o.h / 2 - (o.z || 0) - 15, 40, 5);
                    ctx.fillStyle = hpPct > 0.5 ? '#00CC00' : hpPct > 0.25 ? '#CCCC00' : '#CC0000';
                    ctx.fillRect(o.x - 20, o.y - o.h / 2 - (o.z || 0) - 15, 40 * hpPct, 5);
                }
            }

            drawProjectiles();
            drawParticles();
            drawHUD();
            break;

        case 'levelClear':
            drawLevelClear();
            break;

        case 'gameOver':
            drawGameOver();
            break;

        case 'victory':
            drawVictory();
            break;
    }

    // Screen flash
    if (screenFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${screenFlash / 10})`;
        ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
}

// ---- Start ----
gameLoop();

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
let gameState = 'title'; // title, charSelect, playing, levelClear, gameOver, victory
let selectedChar = 0;
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

// ---- Special Ability State ----
let specialAbility = {
    active: false,
    timer: 0,        // frames remaining (30s = 1800 frames at 60fps)
    cooldown: 0,     // cooldown frames remaining
    triggered: false, // has been used this life?
};
// Peak combo tracks the highest combo reached without resetting (for Goku trigger)
let peakCombo = 0;

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

// ---- Character Roster ----
const CHARACTERS = [
    {
        name: 'GOKU',
        desc: '20-hit combo triggers SUPER SAIYAN for 30s!',
        body: '#FF6600', outline: '#CC4400', hair: '#111111', pants: '#FF6600', belt: '#0044CC',
        skin: '#FFCC88',
        speed: 3.5, maxHP: 100, maxEnergy: 100, punchDmg: 8, kickDmg: 12, specialDmg: 20,
        hairStyle: 'goku',
        // Super Saiyan: 20-hit combo → 30s of 2x damage, +speed, golden aura, invincible to knockback
        ability: 'supersaiyan',
        abilityName: 'SUPER SAIYAN',
        abilityDesc: '20-HIT COMBO TO TRANSFORM',
        abilityTrigger: 'combo', // triggered by reaching 20 combo
        abilityCombo: 20,
        abilityDuration: 1800, // 30s at 60fps
        // Buffs during super saiyan
        ssBody: '#FFD700', ssOutline: '#DDAA00', ssHair: '#FFD700',
        ssDmgMult: 2.0, ssSpeedMult: 1.4,
    },
    {
        name: 'RYU',
        desc: 'DRAGON FIST: 15-combo unleashes piercing blast',
        body: '#FF8800', outline: '#CC5500', hair: '#FFD700', pants: '#2244AA', belt: '#8B0000',
        skin: '#FFCC88',
        speed: 3.5, maxHP: 100, maxEnergy: 100, punchDmg: 8, kickDmg: 12, specialDmg: 20,
        hairStyle: 'spiky',
        // Dragon Fist: 15-hit combo → 30s of triple ki blast (3 projectiles per shot), free energy
        ability: 'dragonfist',
        abilityName: 'DRAGON FIST',
        abilityDesc: '15-HIT COMBO TO UNLEASH',
        abilityTrigger: 'combo',
        abilityCombo: 15,
        abilityDuration: 1800,
    },
    {
        name: 'KIRA',
        desc: 'SHADOW CLONE: 12-combo summons clones to fight',
        body: '#9922CC', outline: '#660099', hair: '#FF44AA', pants: '#1a1a2e', belt: '#CC00CC',
        skin: '#FFBB99',
        speed: 4.5, maxHP: 80, maxEnergy: 120, punchDmg: 6, kickDmg: 10, specialDmg: 18,
        hairStyle: 'long',
        // Shadow Clone: 12-hit combo → 30s of shadow clones that mirror attacks
        ability: 'shadowclone',
        abilityName: 'SHADOW CLONE',
        abilityDesc: '12-HIT COMBO TO SUMMON',
        abilityTrigger: 'combo',
        abilityCombo: 12,
        abilityDuration: 600,
    },
    {
        name: 'BRUTUS',
        desc: 'BERSERKER: 10-combo triggers unstoppable rage',
        body: '#228844', outline: '#115522', hair: '#8B4513', pants: '#444444', belt: '#FFD700',
        skin: '#DDA577',
        speed: 2.5, maxHP: 140, maxEnergy: 70, punchDmg: 12, kickDmg: 16, specialDmg: 25,
        hairStyle: 'mohawk',
        // Berserker: 10-hit combo → 30s of 2.5x damage, can't be stunned, massive knockback
        ability: 'berserker',
        abilityName: 'BERSERKER RAGE',
        abilityDesc: '15-HIT COMBO TO RAGE',
        abilityTrigger: 'combo',
        abilityCombo: 15,
        abilityDuration: 300,
        berserkDmgMult: 2.5, berserkSpeedMult: 1.3,
        berserkBody: '#CC0000', berserkOutline: '#880000',
    },
    {
        name: 'BLAZE',
        desc: 'INFERNO: 15-combo ignites all enemies on screen',
        body: '#CC2200', outline: '#881100', hair: '#FF4400', pants: '#222222', belt: '#FF8800',
        skin: '#FFCC88',
        speed: 3.2, maxHP: 90, maxEnergy: 140, punchDmg: 7, kickDmg: 11, specialDmg: 28,
        hairStyle: 'flame',
        // Inferno: 15-hit combo → 30s of fire aura that burns nearby enemies + fire trail
        ability: 'inferno',
        abilityName: 'INFERNO MODE',
        abilityDesc: '15-HIT COMBO TO IGNITE',
        abilityTrigger: 'combo',
        abilityCombo: 15,
        abilityDuration: 1800,
    },
];

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
            case 'aura':
                p.vx = (Math.random() - 0.5) * 2;
                p.vy = -3 - Math.random() * 4;
                p.size = 4 + Math.random() * 6;
                p.color = ['#FFD700', '#FFEE44', '#FFFFFF'][Math.floor(Math.random() * 3)];
                p.decay = 0.03;
                break;
            case 'fire_aura':
                p.vx = (Math.random() - 0.5) * 3;
                p.vy = -2 - Math.random() * 3;
                p.size = 3 + Math.random() * 5;
                p.color = ['#FF4400', '#FF8800', '#FFCC00', '#FF0000'][Math.floor(Math.random() * 4)];
                p.decay = 0.04;
                break;
            case 'shadow':
                p.vx = (Math.random() - 0.5) * 4;
                p.vy = (Math.random() - 0.5) * 4;
                p.size = 3 + Math.random() * 4;
                p.color = ['#9922CC', '#CC44FF', '#6600AA'][Math.floor(Math.random() * 3)];
                p.decay = 0.04;
                break;
            case 'rage':
                p.vx = (Math.random() - 0.5) * 5;
                p.vy = -2 - Math.random() * 4;
                p.size = 5 + Math.random() * 7;
                p.color = ['#FF0000', '#CC0000', '#FF4400'][Math.floor(Math.random() * 3)];
                p.decay = 0.03;
                break;
            case 'transform':
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.5) * 15;
                p.size = 5 + Math.random() * 10;
                p.color = ['#FFD700', '#FFFFFF', '#FFEE44', '#FF8800'][Math.floor(Math.random() * 4)];
                p.decay = 0.015;
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

    // Override colors when special ability is active
    if (isPlayer && specialAbility.active) {
        let ch = CHARACTERS[selectedChar];
        if (ch.ability === 'supersaiyan') {
            bodyColor = ch.ssBody;
            outlineColor = ch.ssOutline;
        } else if (ch.ability === 'berserker') {
            bodyColor = ch.berserkBody;
            outlineColor = ch.berserkOutline;
        }
    }

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
    ctx.fillStyle = isPlayer ? CHARACTERS[selectedChar].pants : bodyColor;
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
        ctx.fillStyle = CHARACTERS[selectedChar].belt;
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
        ctx.fillStyle = isPlayer ? CHARACTERS[selectedChar].skin : bodyColor;
        ctx.fillRect(armX + 8, armY - 2, 10, 10);
        ctx.strokeRect(armX + 8, armY - 2, 10, 10);
    }

    // Head
    ctx.fillStyle = isPlayer ? CHARACTERS[selectedChar].skin : '#DDBB99';
    ctx.strokeStyle = outlineColor;
    ctx.beginPath();
    ctx.arc(0, -h / 3 + bobY, w / 4 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair (player gets character-specific hair)
    if (isPlayer) {
        let ch = CHARACTERS[selectedChar];
        let hairColor = ch.hair;
        // Override colors when ability is active
        if (specialAbility.active) {
            if (ch.ability === 'supersaiyan') hairColor = ch.ssHair;
        }
        ctx.fillStyle = hairColor;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        let hx = 0, hy = -h / 3 + bobY;
        switch (ch.hairStyle) {
            case 'goku':
                // Goku hair - taller, wilder spikes
                if (specialAbility.active) {
                    // Super Saiyan - bigger, golden, more spikes
                    ctx.fillStyle = '#FFD700';
                    ctx.strokeStyle = '#DDAA00';
                    ctx.beginPath();
                    ctx.moveTo(hx - 14, hy);
                    ctx.lineTo(hx - 16, hy - 36);
                    ctx.lineTo(hx - 8, hy - 14);
                    ctx.lineTo(hx - 4, hy - 44);
                    ctx.lineTo(hx + 2, hy - 16);
                    ctx.lineTo(hx + 6, hy - 48);
                    ctx.lineTo(hx + 10, hy - 18);
                    ctx.lineTo(hx + 16, hy - 38);
                    ctx.lineTo(hx + 18, hy - 8);
                    ctx.lineTo(hx + 14, hy);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    // Extra side spikes
                    ctx.beginPath();
                    ctx.moveTo(hx - 14, hy - 2);
                    ctx.lineTo(hx - 24, hy - 20);
                    ctx.lineTo(hx - 12, hy - 8);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(hx + 14, hy - 2);
                    ctx.lineTo(hx + 24, hy - 20);
                    ctx.lineTo(hx + 12, hy - 8);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                } else {
                    // Base form - black spiky hair
                    ctx.beginPath();
                    ctx.moveTo(hx - 12, hy);
                    ctx.lineTo(hx - 10, hy - 24);
                    ctx.lineTo(hx - 4, hy - 10);
                    ctx.lineTo(hx + 0, hy - 30);
                    ctx.lineTo(hx + 6, hy - 12);
                    ctx.lineTo(hx + 12, hy - 26);
                    ctx.lineTo(hx + 14, hy - 6);
                    ctx.lineTo(hx + 12, hy);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                }
                break;
            case 'spiky':
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
                ctx.fill(); ctx.stroke();
                break;
            case 'long':
                ctx.beginPath();
                ctx.arc(hx, hy - 4, 16, Math.PI, 0);
                ctx.lineTo(hx + 14, hy + 16);
                ctx.lineTo(hx + 10, hy + 14);
                ctx.lineTo(hx - 10, hy + 14);
                ctx.lineTo(hx - 14, hy + 16);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'mohawk':
                ctx.fillRect(hx - 4, hy - 24, 8, 20);
                ctx.strokeRect(hx - 4, hy - 24, 8, 20);
                break;
            case 'flame':
                ctx.beginPath();
                ctx.moveTo(hx - 10, hy);
                ctx.lineTo(hx - 6, hy - 18);
                ctx.lineTo(hx - 2, hy - 8);
                ctx.lineTo(hx + 2, hy - 26);
                ctx.lineTo(hx + 6, hy - 10);
                ctx.lineTo(hx + 10, hy - 20);
                ctx.lineTo(hx + 12, hy);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Flame flicker
                ctx.globalAlpha = 0.5 + Math.sin(frame * 0.4) * 0.3;
                ctx.fillStyle = '#FFDD00';
                ctx.beginPath();
                ctx.moveTo(hx - 6, hy - 4);
                ctx.lineTo(hx, hy - 22 - Math.sin(frame * 0.6) * 4);
                ctx.lineTo(hx + 6, hy - 4);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
        }
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
        damage: fromPlayer ? CHARACTERS[selectedChar].specialDmg : 10,
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

// ---- Ability HUD ----
function drawAbilityHUD() {
    let ch = CHARACTERS[selectedChar];
    if (!ch.ability) return;

    ctx.save();

    if (specialAbility.active) {
        // Active ability bar - shows remaining time
        let pct = specialAbility.timer / ch.abilityDuration;
        let barW = 200;
        let barX = W / 2 - barW / 2;
        let barY = 60;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, 18);

        // Timer bar with ability-specific color
        let barColor;
        switch (ch.ability) {
            case 'supersaiyan': barColor = '#FFD700'; break;
            case 'dragonfist': barColor = '#44CCFF'; break;
            case 'shadowclone': barColor = '#CC44FF'; break;
            case 'berserker': barColor = '#FF0000'; break;
            case 'inferno': barColor = '#FF4400'; break;
            default: barColor = '#FFF';
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * pct, 14);

        // Flashing when about to expire
        if (specialAbility.timer < 300 && levelTimer % 10 < 5) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(barX, barY, barW * pct, 14);
        }

        ctx.strokeStyle = barColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barW + 4, 18);

        // Ability name
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ch.abilityName + ' - ' + Math.ceil(specialAbility.timer / 60) + 's', W / 2, barY + 12);
        ctx.textAlign = 'left';
    } else {
        // Show combo progress toward ability trigger
        let comboPct = Math.min(comboCount / ch.abilityCombo, 1);
        if (comboPct > 0 && !specialAbility.triggered) {
            let barW = 120;
            let barX = W / 2 - barW / 2;
            let barY = 60;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX - 2, barY - 2, barW + 4, 14);
            ctx.fillStyle = comboPct >= 1 ? '#FFD700' : '#888';
            ctx.fillRect(barX, barY, barW * comboPct, 10);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(barX - 2, barY - 2, barW + 4, 14);

            ctx.fillStyle = '#AAA';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ch.abilityDesc + ' (' + comboCount + '/' + ch.abilityCombo + ')', W / 2, barY + 9);
            ctx.textAlign = 'left';
        }
    }

    ctx.restore();
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
            let ch = CHARACTERS[selectedChar];
            let damage = player.state === 'kick' ? ch.kickDmg : player.state === 'jumpkick' ? Math.floor(ch.kickDmg * 1.25) : (ch.punchDmg + player.punchCombo * 3);
            for (let e of enemies) {
                if (e.state !== 'dead' && boxOverlap(hitbox, e)) {
                    hurtEnemy(e, damage, player.facing);
                }
            }
            // Shadow clone attacks
            shadowCloneAttack(hitbox, damage, player.facing);
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
        let ch = CHARACTERS[selectedChar];

        if (specialAbility.active && ch.ability === 'dragonfist') {
            // Triple blast - spread pattern
            projectiles.push(createProjectile(player.x + player.facing * 30, player.y - 10, player.facing, 'energy', true));
            projectiles.push(createProjectile(player.x + player.facing * 30, player.y - 30, player.facing, 'energy', true));
            projectiles.push(createProjectile(player.x + player.facing * 30, player.y + 10, player.facing, 'energy', true));
            spawnParticle(player.x, player.y - 10, 'energy', 20);
            screenShake = 12;
        } else {
            projectiles.push(createProjectile(
                player.x + player.facing * 30,
                player.y - 10,
                player.facing,
                'energy',
                true
            ));
            spawnParticle(player.x, player.y - 10, 'energy', 10);
            screenShake = 8;
        }
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
        if (comboTimer <= 0) { comboCount = 0; peakCombo = 0; }
    }

    // Update special ability
    updateSpecialAbility();
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

// ---- Special Ability System ----
function activateSpecialAbility() {
    let ch = CHARACTERS[selectedChar];
    specialAbility.active = true;
    specialAbility.timer = ch.abilityDuration;
    specialAbility.triggered = true;

    // Big transformation effect
    spawnParticle(player.x, player.y, 'transform', 40);
    screenShake = 20;
    screenFlash = 15;
    hitstopFrames = 15;

    // Apply stat changes
    if (ch.ability === 'supersaiyan') {
        player.speed = ch.speed * ch.ssSpeedMult;
    } else if (ch.ability === 'berserker') {
        player.speed = ch.speed * ch.berserkSpeedMult;
        player.invincible = 30; // brief invincibility on activation
    } else if (ch.ability === 'shadowclone') {
        // Clones are handled in updatePlayer
    }
}

function deactivateSpecialAbility() {
    let ch = CHARACTERS[selectedChar];
    specialAbility.active = false;
    specialAbility.timer = 0;

    // Restore base stats
    player.speed = ch.speed;

    // Wind-down particles
    spawnParticle(player.x, player.y, 'energy', 15);
}

function updateSpecialAbility() {
    if (!specialAbility.active) return;

    let ch = CHARACTERS[selectedChar];
    specialAbility.timer--;

    if (specialAbility.timer <= 0) {
        deactivateSpecialAbility();
        return;
    }

    // Per-frame effects based on ability
    switch (ch.ability) {
        case 'supersaiyan':
            // Golden aura particles
            if (levelTimer % 3 === 0) {
                spawnParticle(player.x + (Math.random() - 0.5) * 30, player.y + 10, 'aura', 1);
            }
            // Energy regens faster
            player.energy = Math.min(player.maxEnergy, player.energy + 0.2);
            break;

        case 'dragonfist':
            // Blue dragon aura
            if (levelTimer % 4 === 0) {
                spawnParticle(player.x + (Math.random() - 0.5) * 20, player.y, 'energy', 1);
            }
            // Free energy during dragon fist
            player.energy = player.maxEnergy;
            break;

        case 'shadowclone':
            // Purple shadow particles
            if (levelTimer % 5 === 0) {
                spawnParticle(player.x + (Math.random() - 0.5) * 40, player.y, 'shadow', 1);
            }
            break;

        case 'berserker':
            // Red rage particles
            if (levelTimer % 3 === 0) {
                spawnParticle(player.x + (Math.random() - 0.5) * 30, player.y + 10, 'rage', 1);
            }
            // Slowly heal during rage
            player.hp = Math.min(player.maxHP, player.hp + 0.05);
            break;

        case 'inferno':
            // Fire aura particles
            if (levelTimer % 2 === 0) {
                spawnParticle(player.x + (Math.random() - 0.5) * 40, player.y + 20, 'fire_aura', 1);
            }
            // Burn nearby enemies
            if (levelTimer % 20 === 0) {
                for (let e of enemies) {
                    if (e.state !== 'dead') {
                        let dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
                        if (dist < 120) {
                            e.hp -= 5;
                            spawnParticle(e.x, e.y - 10, 'fire_aura', 3);
                            if (e.hp <= 0) {
                                e.state = 'dead';
                                enemiesDefeated++;
                                score += e.score;
                                spawnParticle(e.x, e.y, 'death', 20);
                                screenShake = 6;
                            }
                        }
                    }
                }
            }
            break;
    }
}

// Draw shadow clones (for Kira's ability)
function drawShadowClones() {
    if (!specialAbility.active || CHARACTERS[selectedChar].ability !== 'shadowclone') return;

    // Draw two ghost clones offset from player
    let offsets = [
        { x: -40, y: -15, alpha: 0.4 },
        { x: 40, y: 15, alpha: 0.4 },
    ];

    for (let off of offsets) {
        ctx.globalAlpha = off.alpha + Math.sin(levelTimer * 0.1) * 0.1;
        let ch = CHARACTERS[selectedChar];
        drawCharacter(
            player.x + off.x, player.y + off.y, player.z,
            player.w, player.h, player.facing,
            { body: ch.body, outline: ch.outline },
            player.state, player.frame, true, 'player'
        );
    }
    ctx.globalAlpha = 1;
}

// Shadow clones deal damage when player attacks
function shadowCloneAttack(hitbox, damage, facing) {
    if (!specialAbility.active || CHARACTERS[selectedChar].ability !== 'shadowclone') return;
    let offsets = [{ x: -40, y: -15 }, { x: 40, y: 15 }];
    for (let off of offsets) {
        let cloneHitbox = {
            x: hitbox.x + off.x,
            y: hitbox.y + off.y,
            w: hitbox.w,
            h: hitbox.h,
        };
        for (let e of enemies) {
            if (e.state !== 'dead' && boxOverlap(cloneHitbox, e)) {
                e.hp -= Math.floor(damage * 0.6);
                e.state = 'hurt';
                e.hurtTimer = 10;
                e.vx = facing * 4;
                spawnParticle(e.x, e.y - e.h / 3, 'shadow', 5);
                if (e.hp <= 0) {
                    e.state = 'dead';
                    enemiesDefeated++;
                    score += e.score;
                    spawnParticle(e.x, e.y, 'death', 15);
                    screenShake = 6;
                }
            }
        }
    }
}

// Draw ability aura around player
function drawAbilityAura() {
    if (!specialAbility.active) return;
    let ch = CHARACTERS[selectedChar];
    let px = player.x, py = player.y - player.z;

    ctx.save();
    switch (ch.ability) {
        case 'supersaiyan':
            // Golden pulsing aura
            let ssPulse = Math.sin(levelTimer * 0.15) * 0.15 + 0.3;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.globalAlpha = ssPulse;
            ctx.beginPath();
            ctx.ellipse(px, py - 10, 35 + Math.sin(levelTimer * 0.2) * 5, 50 + Math.sin(levelTimer * 0.15) * 5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = ssPulse * 0.5;
            ctx.fillStyle = 'rgba(255,215,0,0.15)';
            ctx.fill();
            break;

        case 'berserker':
            let ragePulse = Math.sin(levelTimer * 0.2) * 0.15 + 0.25;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 4;
            ctx.globalAlpha = ragePulse;
            ctx.beginPath();
            ctx.ellipse(px, py - 5, 40 + Math.sin(levelTimer * 0.3) * 8, 45, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case 'inferno':
            let firePulse = Math.sin(levelTimer * 0.1) * 0.1 + 0.2;
            ctx.globalAlpha = firePulse;
            // Draw fire radius indicator
            ctx.strokeStyle = '#FF4400';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.ellipse(px, py + 20, 120, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            break;

        case 'dragonfist':
            let dragonPulse = Math.sin(levelTimer * 0.12) * 0.15 + 0.25;
            ctx.strokeStyle = '#44CCFF';
            ctx.lineWidth = 3;
            ctx.globalAlpha = dragonPulse;
            ctx.beginPath();
            ctx.ellipse(px, py - 10, 32, 48, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }
    ctx.restore();
}

// ---- Hurt Functions ----
function hurtEnemy(e, damage, knockDir) {
    // Apply ability damage multipliers
    let ch = CHARACTERS[selectedChar];
    if (specialAbility.active) {
        if (ch.ability === 'supersaiyan') damage = Math.floor(damage * ch.ssDmgMult);
        else if (ch.ability === 'berserker') damage = Math.floor(damage * ch.berserkDmgMult);
        else if (ch.ability === 'dragonfist') damage = Math.floor(damage * 1.5);
    }

    e.hp -= damage;
    e.state = 'hurt';
    e.hurtTimer = 15;
    e.vx = knockDir * (specialAbility.active && ch.ability === 'berserker' ? 12 : 6);
    spawnParticle(e.x, e.y - e.h / 3, 'hit', 8);
    screenShake = 4;
    hitstopFrames = 3;
    comboCount++;
    comboTimer = 90;
    if (comboCount > peakCombo) peakCombo = comboCount;
    score += 10 * comboCount;

    // Check ability trigger
    if (!specialAbility.active && ch.abilityTrigger === 'combo' && comboCount >= ch.abilityCombo) {
        activateSpecialAbility();
    }

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
    // Ability damage reduction
    if (specialAbility.active) {
        let ch = CHARACTERS[selectedChar];
        if (ch.ability === 'supersaiyan') damage = Math.floor(damage * 0.5);
        if (ch.ability === 'berserker') damage = Math.floor(damage * 0.3);
    }
    player.hp -= damage;
    player.state = 'hurt';
    player.hurtTimer = specialAbility.active && CHARACTERS[selectedChar].ability === 'berserker' ? 8 : 20;
    player.vx = knockDir * (specialAbility.active && CHARACTERS[selectedChar].ability === 'berserker' ? 2 : 5);
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
    peakCombo = 0;
    // Allow ability to trigger again each level (but deactivate if currently active)
    if (specialAbility.active) deactivateSpecialAbility();
    specialAbility.triggered = false;
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
    let ch = CHARACTERS[selectedChar];
    player.speed = ch.speed;
    player.maxHP = ch.maxHP;
    player.maxEnergy = ch.maxEnergy;
    score = 0;
    player.hp = player.maxHP;
    player.energy = player.maxEnergy / 2;
    player.lives = 3;
    specialAbility.active = false;
    specialAbility.timer = 0;
    specialAbility.cooldown = 0;
    specialAbility.triggered = false;
    peakCombo = 0;
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
        { body: CHARACTERS[selectedChar].body, outline: CHARACTERS[selectedChar].outline },
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
    ctx.fillText('PRESS ENTER TO SELECT FIGHTER', W / 2, 530);

    ctx.restore();
}

// ---- Character Select Screen ----
function drawCharSelect() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,102,0,0.1)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('CHOOSE YOUR FIGHTER', W / 2, 50);

    // Character slots
    let slotW = Math.min(170, (W - 60) / CHARACTERS.length - 10);
    let totalW = CHARACTERS.length * slotW + (CHARACTERS.length - 1) * 10;
    let startX = (W - totalW) / 2 + slotW / 2;

    for (let i = 0; i < CHARACTERS.length; i++) {
        let ch = CHARACTERS[i];
        let cx = startX + i * (slotW + 10);
        let cy = 220;
        let isSelected = i === selectedChar;

        // Slot background
        ctx.fillStyle = isSelected ? 'rgba(255,136,0,0.3)' : 'rgba(40,40,60,0.6)';
        ctx.fillRect(cx - slotW / 2, 80, slotW, 300);

        // Selection border
        if (isSelected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.strokeRect(cx - slotW / 2, 80, slotW, 300);
            // Animated corner highlights
            let pulse = Math.sin(levelTimer * 0.1) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255,215,0,${pulse * 0.6})`;
            ctx.fillRect(cx - slotW / 2 - 2, 78, slotW + 4, 4);
            ctx.fillRect(cx - slotW / 2 - 2, 376, slotW + 4, 4);
        } else {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - slotW / 2, 80, slotW, 300);
        }

        // Character name
        ctx.fillStyle = isSelected ? '#FFD700' : '#888';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(ch.name, cx, 110);

        // Draw character model
        drawCharacter(cx, cy, 0, 48, 64, 1,
            { body: ch.body, outline: ch.outline },
            isSelected ? 'walk' : 'idle', levelTimer, true, 'player');

        // Stats
        let statY = 290;
        ctx.font = '11px monospace';

        // SPD bar
        ctx.fillStyle = '#888';
        ctx.fillText('SPD', cx - 40, statY);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 15, statY - 8, 60, 8);
        ctx.fillStyle = '#44CC44';
        ctx.fillRect(cx - 15, statY - 8, (ch.speed / 5) * 60, 8);

        // HP bar
        statY += 18;
        ctx.fillStyle = '#888';
        ctx.fillText('HP', cx - 40, statY);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 15, statY - 8, 60, 8);
        ctx.fillStyle = '#CC4444';
        ctx.fillRect(cx - 15, statY - 8, (ch.maxHP / 150) * 60, 8);

        // KI bar
        statY += 18;
        ctx.fillStyle = '#888';
        ctx.fillText('KI', cx - 40, statY);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 15, statY - 8, 60, 8);
        ctx.fillStyle = '#4488FF';
        ctx.fillRect(cx - 15, statY - 8, (ch.maxEnergy / 150) * 60, 8);

        // PWR bar
        statY += 18;
        ctx.fillStyle = '#888';
        ctx.fillText('PWR', cx - 40, statY);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 15, statY - 8, 60, 8);
        ctx.fillStyle = '#FF8800';
        ctx.fillRect(cx - 15, statY - 8, (ch.punchDmg / 14) * 60, 8);

        // Ability name under stats
        if (ch.abilityName) {
            ctx.fillStyle = isSelected ? '#FFD700' : '#666';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(ch.abilityName, cx, statY + 18);
        }
    }

    // Selected character description
    {
        let ch = CHARACTERS[selectedChar];
        ctx.fillStyle = '#CCC';
        ctx.font = '13px monospace';
        ctx.fillText(ch.desc, W / 2, 400);
    }

    // Navigation hints
    ctx.fillStyle = '#AAA';
    ctx.font = '14px monospace';
    ctx.fillText('< LEFT / RIGHT >', W / 2, 430);

    // Confirm prompt
    ctx.fillStyle = Math.sin(levelTimer * 0.08) > 0 ? '#FFD700' : '#FF8800';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESS ENTER TO FIGHT', W / 2, 470);

    // Selected character name big
    ctx.fillStyle = CHARACTERS[selectedChar].body;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(CHARACTERS[selectedChar].name, W / 2, 510);

    ctx.textAlign = 'left';
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
                gameState = 'charSelect';
                keys['Enter'] = false;
            }
            break;

        case 'charSelect':
            if (keys['ArrowLeft'] || keys['a']) {
                selectedChar = (selectedChar - 1 + CHARACTERS.length) % CHARACTERS.length;
                keys['ArrowLeft'] = false;
                keys['a'] = false;
            }
            if (keys['ArrowRight'] || keys['d']) {
                selectedChar = (selectedChar + 1) % CHARACTERS.length;
                keys['ArrowRight'] = false;
                keys['d'] = false;
            }
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

        case 'charSelect':
            drawCharSelect();
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
                    colors = { body: CHARACTERS[selectedChar].body, outline: CHARACTERS[selectedChar].outline };
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

            drawShadowClones();
            drawAbilityAura();
            drawProjectiles();
            drawParticles();
            drawHUD();
            drawAbilityHUD();
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

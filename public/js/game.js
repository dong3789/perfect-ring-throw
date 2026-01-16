// ========================================
// Perfect Ring Toss - 3D Perspective Engine
// Front-to-back throwing view
// ========================================

// ========================================
// Constants
// ========================================
const COLORS = {
    ring: '#6366f1',
    ringLight: '#818cf8',
    ringDark: '#4f46e5',
    pole: '#d4a574',
    poleLight: '#e8c9a0',
    poleDark: '#b8956a',
    ground: '#1a1a2e',
    groundLight: '#252540'
};

const PHYSICS = {
    gravity: 15,
    throwPowerMultiplier: 0.8,
    maxPower: 100,
    airResistance: 0.995
};

// 3D Camera settings
const CAMERA = {
    fov: 400, // Field of view (perspective strength)
    height: 50, // Camera height
    distance: 200 // Camera distance from origin
};

// ========================================
// Utility: 3D to 2D Projection
// ========================================
function project3Dto2D(x3d, y3d, z3d, canvas) {
    // Perspective projection
    const scale = CAMERA.fov / (CAMERA.fov + z3d);
    const x2d = canvas.width / 2 + x3d * scale;
    const y2d = canvas.height * 0.85 - y3d * scale + z3d * 0.3; // Higher z = higher on screen
    return { x: x2d, y: y2d, scale };
}

// ========================================
// Game State
// ========================================
class GameState {
    constructor() {
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('ringToss_bestScore')) || 0;
        this.isPlaying = false;
        this.currentScreen = 'menu';
    }

    addScore() {
        this.score++;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('ringToss_bestScore', this.bestScore);
            return true;
        }
        return false;
    }

    reset() {
        this.score = 0;
        this.isPlaying = false;
    }
}

// ========================================
// Pole (Target) Class - 3D
// ========================================
class Pole {
    constructor() {
        // 3D position (center of play area, far away)
        this.x = 0;
        this.y = 0; // Ground level
        this.z = 350; // Distance from camera
        this.height = 120;
        this.radius = 8;
    }

    draw(ctx, canvas) {
        const base = project3Dto2D(this.x, this.y, this.z, canvas);
        const top = project3Dto2D(this.x, this.height, this.z, canvas);

        // Pole shadow on ground
        ctx.beginPath();
        ctx.ellipse(base.x + 10, base.y + 5, 25 * base.scale, 8 * base.scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Pole body
        const poleWidth = this.radius * 2 * base.scale;
        const gradient = ctx.createLinearGradient(
            base.x - poleWidth / 2, 0,
            base.x + poleWidth / 2, 0
        );
        gradient.addColorStop(0, COLORS.poleDark);
        gradient.addColorStop(0.3, COLORS.poleLight);
        gradient.addColorStop(0.7, COLORS.pole);
        gradient.addColorStop(1, COLORS.poleDark);

        ctx.beginPath();
        ctx.moveTo(base.x - poleWidth / 2, base.y);
        ctx.lineTo(top.x - poleWidth / 2 * 0.7, top.y);
        ctx.lineTo(top.x + poleWidth / 2 * 0.7, top.y);
        ctx.lineTo(base.x + poleWidth / 2, base.y);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pole top cap
        ctx.beginPath();
        ctx.arc(top.x, top.y, poleWidth / 2 * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.poleLight;
        ctx.fill();

        // Base
        ctx.beginPath();
        ctx.ellipse(base.x, base.y, 30 * base.scale, 10 * base.scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.poleDark;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(base.x, base.y - 3, 30 * base.scale, 10 * base.scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.pole;
        ctx.fill();
    }

    getHitZone() {
        return {
            x: this.x,
            z: this.z,
            radius: this.radius * 1.5, // Hit detection radius
            minY: 20,
            maxY: this.height - 10
        };
    }
}

// ========================================
// Ring Class - 3D
// ========================================
class Ring {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }

    reset() {
        // Starting position (near camera, centered)
        this.x = 0;
        this.y = 30; // Slightly above ground
        this.z = 50; // Near camera

        // Velocity
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;

        // Ring properties
        this.outerRadius = 25;
        this.innerRadius = 15;
        this.tilt = 0.3; // Ring tilt angle (radians) - tilted toward camera
        this.rotation = 0;

        this.state = 'ready'; // ready, aiming, flying, success, fail
        this.trail = [];

        // Landing state
        this.onPole = false;
        this.settleY = 0;
    }

    launch(power, angle) {
        // angle: horizontal angle (-1 to 1, left to right)
        // power: throw strength (0 to 1)

        const throwPower = power * PHYSICS.maxPower * PHYSICS.throwPowerMultiplier;

        this.vx = angle * throwPower * 0.3; // Slight horizontal
        this.vy = throwPower * 0.5; // Upward arc
        this.vz = throwPower * 0.9; // Forward (into screen)

        this.state = 'flying';
    }

    update(dt) {
        if (this.state !== 'flying') return;

        // Save trail
        if (this.z < 400) {
            this.trail.push({ x: this.x, y: this.y, z: this.z, alpha: 1 });
            if (this.trail.length > 15) this.trail.shift();
        }

        // Update trail alpha
        this.trail.forEach((t, i) => {
            t.alpha = (i / this.trail.length) * 0.4;
        });

        // Apply physics
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;

        // Gravity (pulls down on Y)
        this.vy -= PHYSICS.gravity * dt;

        // Air resistance
        this.vx *= PHYSICS.airResistance;
        this.vy *= PHYSICS.airResistance;
        this.vz *= PHYSICS.airResistance;

        // Ring rotation during flight
        this.rotation += 3 * dt;
        this.tilt = Math.max(0.1, this.tilt - 0.5 * dt); // Flatten as it flies

        // Check if ring went past target or fell
        if (this.z > 500 || this.y < -50) {
            this.state = 'fail';
        }
    }

    draw(ctx, canvas) {
        // Draw trail
        this.trail.forEach(t => {
            const proj = project3Dto2D(t.x, t.y, t.z, canvas);
            if (proj.scale > 0.1) {
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, 8 * proj.scale, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${t.alpha})`;
                ctx.fill();
            }
        });

        const proj = project3Dto2D(this.x, this.y, this.z, canvas);
        if (proj.scale < 0.05) return;

        const scale = proj.scale;
        const outerR = this.outerRadius * scale;
        const innerR = this.innerRadius * scale;

        ctx.save();
        ctx.translate(proj.x, proj.y);

        // Ring tilt effect (ellipse instead of circle)
        const tiltFactor = Math.cos(this.tilt);

        // Shadow
        ctx.beginPath();
        ctx.ellipse(3, 3, outerR, outerR * tiltFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Ring outer
        ctx.beginPath();
        ctx.ellipse(0, 0, outerR, outerR * tiltFactor, 0, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            -outerR * 0.3, -outerR * 0.3 * tiltFactor, 0,
            0, 0, outerR
        );
        gradient.addColorStop(0, COLORS.ringLight);
        gradient.addColorStop(0.6, COLORS.ring);
        gradient.addColorStop(1, COLORS.ringDark);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ring hole (inner)
        ctx.beginPath();
        ctx.ellipse(0, 0, innerR, innerR * tiltFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(12, 12, 20, 0.9)';
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.ellipse(-outerR * 0.35, -outerR * 0.35 * tiltFactor, outerR * 0.15, outerR * 0.1 * tiltFactor, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        ctx.restore();
    }

    checkCollision(pole) {
        if (this.state !== 'flying') return null;

        const hitZone = pole.getHitZone();

        // Check if ring is near the pole in Z
        const zDiff = Math.abs(this.z - hitZone.z);
        if (zDiff > 30) return null; // Too far in Z

        // Check if ring center is close to pole center in X
        const xDiff = Math.abs(this.x - hitZone.x);

        // Check Y is in valid range (ring should be above base, below top)
        const inYRange = this.y > hitZone.minY && this.y < hitZone.maxY;

        // Success: ring hole passes over the pole
        if (xDiff < this.innerRadius && inYRange && this.vz > 0) {
            // Ring caught!
            this.state = 'success';
            this.settleY = this.y;
            return 'success';
        }

        // Miss: ring hit the pole but didn't go through
        if (xDiff < this.outerRadius + hitZone.radius && zDiff < 20) {
            // Bounced off
            if (Math.abs(this.x - hitZone.x) > this.innerRadius) {
                this.vz = -this.vz * 0.3;
                this.vx += (this.x > hitZone.x ? 1 : -1) * 20;
            }
        }

        return null;
    }
}

// ========================================
// Particle System
// ========================================
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, z, count, canvas) {
        for (let i = 0; i < count; i++) {
            const proj = project3Dto2D(x, y, z, canvas);
            this.particles.push({
                x: proj.x,
                y: proj.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 100,
                radius: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? COLORS.ring : COLORS.ringLight,
                life: 1,
                decay: Math.random() * 0.02 + 0.015
            });
        }
    }

    update(dt) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
}

// ========================================
// Ground Plane
// ========================================
function drawGround(ctx, canvas) {
    // Gradient ground
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
    gradient.addColorStop(0, '#1e1e2e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

    // Grid lines for depth perception
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    // Horizontal lines (getting closer together as they go back)
    for (let i = 0; i < 20; i++) {
        const z = 50 + i * 30;
        const proj = project3Dto2D(0, 0, z, canvas);
        const y = proj.y;
        if (y < canvas.height * 0.5) continue;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Vertical lines (converging to center)
    for (let i = -5; i <= 5; i++) {
        const nearProj = project3Dto2D(i * 80, 0, 50, canvas);
        const farProj = project3Dto2D(i * 80, 0, 500, canvas);

        ctx.beginPath();
        ctx.moveTo(nearProj.x, nearProj.y);
        ctx.lineTo(farProj.x, farProj.y);
        ctx.stroke();
    }
}

// ========================================
// Aiming Guide
// ========================================
function drawAimingGuide(ctx, canvas, startPos, currentPos, ring) {
    if (!startPos || !currentPos) return;

    const dx = startPos.x - currentPos.x;
    const dy = startPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance / 150, 1);
    const angle = dx / 200; // Horizontal angle

    // Power bar
    const barWidth = 120;
    const barHeight = 8;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = canvas.height - 60;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    const powerColor = power < 0.5 ? '#10b981' : power < 0.8 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = powerColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * power, barHeight, 4);
    ctx.fill();

    // Direction indicator
    const proj = project3Dto2D(ring.x, ring.y, ring.z, canvas);
    const indicatorLength = 60 * power;

    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    ctx.lineTo(proj.x - angle * indicatorLength, proj.y - indicatorLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.arc(proj.x - angle * indicatorLength, proj.y - indicatorLength, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // Trajectory preview (dots)
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    let px = ring.x, py = ring.y, pz = ring.z;
    let pvx = angle * power * PHYSICS.maxPower * 0.3 * PHYSICS.throwPowerMultiplier;
    let pvy = power * PHYSICS.maxPower * 0.5 * PHYSICS.throwPowerMultiplier;
    let pvz = power * PHYSICS.maxPower * 0.9 * PHYSICS.throwPowerMultiplier;

    for (let t = 0; t < 30; t++) {
        px += pvx * 0.016;
        py += pvy * 0.016;
        pz += pvz * 0.016;
        pvy -= PHYSICS.gravity * 0.016;

        if (pz > 400 || py < 0) break;

        const dotProj = project3Dto2D(px, py, pz, canvas);
        if (dotProj.scale > 0.1) {
            ctx.beginPath();
            ctx.arc(dotProj.x, dotProj.y, 3 * dotProj.scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ========================================
// Main Game Class
// ========================================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = new GameState();
        this.pole = new Pole();
        this.ring = null;
        this.particles = new ParticleSystem();

        this.dragStart = null;
        this.dragCurrent = null;
        this.isDragging = false;

        this.lastTime = 0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop(0);
    }

    setupCanvas() {
        const resize = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight - 80;

            this.ring = new Ring(this.canvas);
        };

        resize();
        window.addEventListener('resize', resize);
    }

    setupEventListeners() {
        // Menu buttons
        document.getElementById('btn-solo').addEventListener('click', () => this.startGame('solo'));
        document.getElementById('btn-online').addEventListener('click', () => this.showScreen('nickname'));
        document.getElementById('btn-leaderboard').addEventListener('click', () => this.showLeaderboard());

        // Game over buttons
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame('solo'));
        document.getElementById('btn-home').addEventListener('click', () => this.showScreen('menu'));

        // Nickname buttons
        document.getElementById('btn-join').addEventListener('click', () => this.joinOnline());
        document.getElementById('btn-cancel').addEventListener('click', () => this.showScreen('menu'));

        // Leaderboard
        document.getElementById('btn-close-leaderboard').addEventListener('click', () => this.showScreen('menu'));

        // Game input (mouse)
        this.canvas.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.onDragMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onDragEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onDragEnd(e));

        // Game input (touch)
        this.canvas.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onDragEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.onDragEnd(e));
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    onDragStart(e) {
        if (!this.state.isPlaying || this.ring.state !== 'ready') return;
        e.preventDefault();

        this.isDragging = true;
        this.dragStart = this.getPointerPos(e);
        this.dragCurrent = this.dragStart;
        this.ring.state = 'aiming';

        document.getElementById('game-hint').style.display = 'none';
    }

    onDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        this.dragCurrent = this.getPointerPos(e);
    }

    onDragEnd(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        this.isDragging = false;

        if (this.ring.state === 'aiming') {
            const dx = this.dragStart.x - this.dragCurrent.x;
            const dy = this.dragStart.y - this.dragCurrent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 20) {
                const power = Math.min(distance / 150, 1);
                const angle = dx / 200;
                this.ring.launch(power, angle);
            } else {
                this.ring.state = 'ready';
            }
        }

        this.dragStart = null;
        this.dragCurrent = null;
    }

    startGame(mode) {
        this.state.reset();
        this.state.isPlaying = true;
        this.ring.reset();
        this.showScreen('game');
        this.updateUI();
        document.getElementById('game-hint').style.display = 'block';
    }

    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screen}-screen`).classList.add('active');
        this.state.currentScreen = screen;
    }

    showLeaderboard() {
        this.showScreen('leaderboard');
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = `
            <div class="leaderboard-item top-1">
                <span class="leaderboard-rank">1</span>
                <span class="leaderboard-name">ProGamer</span>
                <span class="leaderboard-score">127</span>
            </div>
            <div class="leaderboard-item top-2">
                <span class="leaderboard-rank">2</span>
                <span class="leaderboard-name">RingMaster</span>
                <span class="leaderboard-score">89</span>
            </div>
            <div class="leaderboard-item top-3">
                <span class="leaderboard-rank">3</span>
                <span class="leaderboard-name">Player123</span>
                <span class="leaderboard-score">76</span>
            </div>
            <div class="leaderboard-item">
                <span class="leaderboard-rank">4</span>
                <span class="leaderboard-name">TossKing</span>
                <span class="leaderboard-score">65</span>
            </div>
            <div class="leaderboard-item">
                <span class="leaderboard-rank">5</span>
                <span class="leaderboard-name">Gamer99</span>
                <span class="leaderboard-score">54</span>
            </div>
        `;
    }

    joinOnline() {
        const nickname = document.getElementById('nickname-input').value.trim();
        if (nickname.length < 1) {
            document.getElementById('nickname-input').focus();
            return;
        }
        alert('Online mode coming soon!');
        this.showScreen('menu');
    }

    gameOver() {
        this.state.isPlaying = false;
        const isNewRecord = this.state.score > 0 && this.state.score >= this.state.bestScore;

        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('new-record').style.display = isNewRecord ? 'block' : 'none';
        document.getElementById('menu-best-score').textContent = this.state.bestScore;

        this.showScreen('gameover');
    }

    onSuccess() {
        this.state.addScore();
        this.updateUI();

        // Celebration particles
        this.particles.emit(this.ring.x, this.ring.y, this.ring.z, 25, this.canvas);

        // Reset ring for next throw
        setTimeout(() => {
            this.ring.reset();
            document.getElementById('game-hint').style.display = 'block';
        }, 800);
    }

    updateUI() {
        document.getElementById('current-score').textContent = this.state.score;
        document.getElementById('best-score').textContent = this.state.bestScore;
        document.getElementById('menu-best-score').textContent = this.state.bestScore;
    }

    update(dt) {
        if (!this.state.isPlaying) return;

        this.ring.update(dt);
        this.particles.update(dt);

        // Check collision
        const result = this.ring.checkCollision(this.pole);
        if (result === 'success') {
            this.onSuccess();
        } else if (this.ring.state === 'fail') {
            this.particles.emit(this.ring.x, this.ring.y, this.ring.z, 15, this.canvas);
            setTimeout(() => this.gameOver(), 600);
        }
    }

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear
        ctx.fillStyle = '#0c0c14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw ground with perspective grid
        drawGround(ctx, canvas);

        // Draw pole
        this.pole.draw(ctx, canvas);

        // Draw ring
        if (this.ring) this.ring.draw(ctx, canvas);

        // Draw aiming guide
        if (this.isDragging && this.ring.state === 'aiming') {
            drawAimingGuide(ctx, canvas, this.dragStart, this.dragCurrent, this.ring);
        }

        // Draw particles
        this.particles.draw(ctx);
    }

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (this.state.currentScreen === 'game') {
            this.update(dt);
            this.draw();
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// ========================================
// Initialize
// ========================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

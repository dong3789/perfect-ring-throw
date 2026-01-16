// ========================================
// Perfect Ring Toss - Game Engine
// ========================================

// ========================================
// Constants
// ========================================
const COLORS = {
    ringColors: ['#FF6B9D', '#9B6BFF', '#6BC5FF', '#6BFFD4', '#FFE66B', '#FFB86B'],
    bar: '#FFE66B',
    barBase: '#FFB86B',
    barHighlight: '#FFF8DC',
    background: ['#1a1a2e', '#16213e', '#0f3460'],
    stars: '#ffffff',
    trail: 'rgba(255, 107, 157, 0.3)'
};

const PHYSICS = {
    gravity: 1200,
    maxPower: 800,
    powerMultiplier: 3,
    rotationSpeed: 5,
    airResistance: 0.99
};

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
            return true; // New record
        }
        return false;
    }

    reset() {
        this.score = 0;
        this.isPlaying = false;
    }
}

// ========================================
// Bar Class
// ========================================
class Bar {
    constructor(canvas) {
        this.canvas = canvas;
        this.update();
    }

    update() {
        // Position bar at right side of canvas
        this.x = this.canvas.width * 0.75;
        this.topY = this.canvas.height * 0.25;
        this.height = this.canvas.height * 0.45;
        this.width = 12;
        this.baseWidth = 80;
        this.baseHeight = 20;
    }

    draw(ctx) {
        // Bar shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x - this.width / 2 + 4, this.topY + 4, this.width, this.height);

        // Main bar
        const gradient = ctx.createLinearGradient(this.x - this.width / 2, 0, this.x + this.width / 2, 0);
        gradient.addColorStop(0, '#DDA15E');
        gradient.addColorStop(0.5, COLORS.bar);
        gradient.addColorStop(1, '#DDA15E');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width / 2, this.topY, this.width, this.height);

        // Bar highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(this.x - this.width / 2 + 2, this.topY, 3, this.height);

        // Bar top cap (rounded)
        ctx.beginPath();
        ctx.arc(this.x, this.topY, this.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.bar;
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.topY - 2, this.width / 4, 0, Math.PI * 2);
        ctx.fill();

        // Base
        const baseY = this.topY + this.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x - this.baseWidth / 2 + 4, baseY + 4, this.baseWidth, this.baseHeight);

        const baseGradient = ctx.createLinearGradient(0, baseY, 0, baseY + this.baseHeight);
        baseGradient.addColorStop(0, COLORS.barBase);
        baseGradient.addColorStop(1, '#CC8844');
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.roundRect(this.x - this.baseWidth / 2, baseY, this.baseWidth, this.baseHeight, 5);
        ctx.fill();

        // Base highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(this.x - this.baseWidth / 2 + 5, baseY + 3, this.baseWidth - 10, 5, 2);
        ctx.fill();
    }

    getHitZone() {
        return {
            x: this.x,
            topY: this.topY,
            bottomY: this.topY + this.height,
            width: this.width
        };
    }
}

// ========================================
// Ring Class
// ========================================
class Ring {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.color = COLORS.ringColors[Math.floor(Math.random() * COLORS.ringColors.length)];
        this.trail = [];
    }

    reset() {
        this.x = this.canvas.width * 0.15;
        this.y = this.canvas.height * 0.75;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.outerRadius = 30;
        this.innerRadius = 18;
        this.state = 'ready'; // ready, aiming, flying, success, fail
        this.trail = [];
        this.color = COLORS.ringColors[Math.floor(Math.random() * COLORS.ringColors.length)];
    }

    launch(angle, power) {
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
        this.state = 'flying';
    }

    update(dt) {
        if (this.state !== 'flying') return;

        // Save trail
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 20) this.trail.shift();

        // Update trail alpha
        this.trail.forEach((t, i) => {
            t.alpha = i / this.trail.length * 0.5;
        });

        // Apply physics
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += PHYSICS.gravity * dt;
        this.vx *= PHYSICS.airResistance;
        this.rotation += PHYSICS.rotationSpeed * dt;

        // Check bounds
        if (this.y > this.canvas.height + 100 ||
            this.x > this.canvas.width + 100 ||
            this.x < -100) {
            this.state = 'fail';
        }
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.outerRadius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 107, 157, ${t.alpha})`;
            ctx.fill();
        });

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Ring shadow
        ctx.beginPath();
        ctx.arc(3, 3, this.outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Ring outer
        ctx.beginPath();
        ctx.arc(0, 0, this.outerRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            -this.outerRadius * 0.3, -this.outerRadius * 0.3, 0,
            0, 0, this.outerRadius
        );
        gradient.addColorStop(0, this.lightenColor(this.color, 30));
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 20));
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ring inner (hole)
        ctx.beginPath();
        ctx.arc(0, 0, this.innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 52, 96, 0.9)';
        ctx.fill();

        // Inner shadow
        ctx.beginPath();
        ctx.arc(0, 0, this.innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(-this.outerRadius * 0.4, -this.outerRadius * 0.4, this.outerRadius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }

    checkCollision(bar) {
        if (this.state !== 'flying') return null;

        const hitZone = bar.getHitZone();

        // Check if ring center passed the bar horizontally
        if (this.x >= hitZone.x - this.innerRadius &&
            this.x <= hitZone.x + this.innerRadius) {

            // Check if ring is at correct height and moving down
            if (this.y >= hitZone.topY &&
                this.y <= hitZone.bottomY &&
                this.vy > 0) {

                // Success! Ring caught on bar
                this.state = 'success';
                return 'success';
            }
        }

        // Check if ring passed the bar completely (missed)
        if (this.x > hitZone.x + this.outerRadius && this.state === 'flying') {
            // Check if it was at the right height but missed the hole
            if (this.y >= hitZone.topY - this.outerRadius &&
                this.y <= hitZone.bottomY + this.outerRadius) {
                // Hit the bar (not through the hole)
                // Let physics continue
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

    emit(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.5) * 400 - 200,
                radius: Math.random() * 8 + 4,
                color: color || COLORS.ringColors[Math.floor(Math.random() * COLORS.ringColors.length)],
                life: 1,
                decay: Math.random() * 0.02 + 0.02
            });
        }
    }

    update(dt) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 500 * dt;
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
// Background Stars
// ========================================
class StarField {
    constructor(canvas) {
        this.canvas = canvas;
        this.stars = [];
        this.init();
    }

    init() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 0.7,
                radius: Math.random() * 2 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 2 + 1
            });
        }
    }

    update(dt) {
        this.stars.forEach(s => {
            s.twinkle += s.speed * dt;
        });
    }

    draw(ctx) {
        this.stars.forEach(s => {
            const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        });
    }

    resize() {
        this.init();
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
        this.bar = null;
        this.ring = null;
        this.particles = new ParticleSystem();
        this.stars = null;

        this.dragStart = null;
        this.dragEnd = null;
        this.isDragging = false;

        this.lastTime = 0;
        this.successCount = 0;

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
            this.canvas.height = container.clientHeight - 80; // Account for header

            this.bar = new Bar(this.canvas);
            this.ring = new Ring(this.canvas);
            this.stars = new StarField(this.canvas);
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
        if (e.touches) {
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
        this.dragEnd = this.dragStart;
        this.ring.state = 'aiming';

        document.getElementById('game-hint').style.display = 'none';
    }

    onDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        this.dragEnd = this.getPointerPos(e);
    }

    onDragEnd(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        this.isDragging = false;

        if (this.ring.state === 'aiming') {
            const dx = this.dragStart.x - this.dragEnd.x;
            const dy = this.dragStart.y - this.dragEnd.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 20) {
                const angle = Math.atan2(dy, dx);
                const power = Math.min(distance * PHYSICS.powerMultiplier, PHYSICS.maxPower);
                this.ring.launch(angle, power);
            } else {
                this.ring.state = 'ready';
            }
        }

        this.dragStart = null;
        this.dragEnd = null;
    }

    startGame(mode) {
        this.state.reset();
        this.state.isPlaying = true;
        this.ring.reset();
        this.bar.update();
        this.successCount = 0;
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
        // TODO: Fetch from server
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
                <span class="leaderboard-name">CandyLover</span>
                <span class="leaderboard-score">65</span>
            </div>
            <div class="leaderboard-item">
                <span class="leaderboard-rank">5</span>
                <span class="leaderboard-name">GamerX</span>
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
        // TODO: Connect to server
        alert('온라인 모드는 곧 지원됩니다!');
        this.showScreen('menu');
    }

    gameOver() {
        this.state.isPlaying = false;
        const isNewRecord = this.state.score > 0 && this.state.score >= this.state.bestScore;

        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('new-record').style.display = isNewRecord ? 'block' : 'none';

        // Update best score display
        document.getElementById('menu-best-score').textContent = this.state.bestScore;

        this.showScreen('gameover');
    }

    onSuccess() {
        const isNewRecord = this.state.addScore();
        this.updateUI();

        // Celebration particles
        this.particles.emit(this.ring.x, this.ring.y, 30, this.ring.color);

        // Reset ring for next throw
        setTimeout(() => {
            this.ring.reset();
            document.getElementById('game-hint').style.display = 'block';
        }, 500);
    }

    updateUI() {
        document.getElementById('current-score').textContent = this.state.score;
        document.getElementById('best-score').textContent = this.state.bestScore;
        document.getElementById('menu-best-score').textContent = this.state.bestScore;
    }

    update(dt) {
        if (!this.state.isPlaying) return;

        this.stars.update(dt);
        this.ring.update(dt);
        this.particles.update(dt);

        // Check collision
        const result = this.ring.checkCollision(this.bar);
        if (result === 'success') {
            this.onSuccess();
        } else if (this.ring.state === 'fail') {
            this.particles.emit(this.ring.x, this.ring.y, 20);
            setTimeout(() => this.gameOver(), 500);
        }
    }

    draw() {
        const ctx = this.ctx;

        // Clear and draw background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, COLORS.background[0]);
        bgGradient.addColorStop(0.5, COLORS.background[1]);
        bgGradient.addColorStop(1, COLORS.background[2]);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        if (this.stars) this.stars.draw(ctx);

        // Draw ground glow
        const groundGlow = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height, 0,
            this.canvas.width / 2, this.canvas.height, this.canvas.height * 0.5
        );
        groundGlow.addColorStop(0, 'rgba(155, 107, 255, 0.2)');
        groundGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = groundGlow;
        ctx.fillRect(0, this.canvas.height * 0.5, this.canvas.width, this.canvas.height * 0.5);

        // Draw bar
        if (this.bar) this.bar.draw(ctx);

        // Draw ring
        if (this.ring) this.ring.draw(ctx);

        // Draw aiming line
        if (this.isDragging && this.dragStart && this.dragEnd) {
            this.drawAimingLine(ctx);
        }

        // Draw particles
        this.particles.draw(ctx);
    }

    drawAimingLine(ctx) {
        const dx = this.dragStart.x - this.dragEnd.x;
        const dy = this.dragStart.y - this.dragEnd.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(distance * PHYSICS.powerMultiplier, PHYSICS.maxPower);
        const angle = Math.atan2(dy, dx);

        // Draw power indicator
        const powerRatio = power / PHYSICS.maxPower;
        const lineLength = powerRatio * 150;

        ctx.beginPath();
        ctx.moveTo(this.ring.x, this.ring.y);
        ctx.lineTo(
            this.ring.x + Math.cos(angle) * lineLength,
            this.ring.y + Math.sin(angle) * lineLength
        );
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw trajectory preview (dotted line)
        ctx.setLineDash([5, 10]);
        ctx.beginPath();

        let px = this.ring.x;
        let py = this.ring.y;
        let pvx = Math.cos(angle) * power;
        let pvy = Math.sin(angle) * power;

        ctx.moveTo(px, py);

        for (let t = 0; t < 50; t++) {
            px += pvx * 0.02;
            py += pvy * 0.02;
            pvy += PHYSICS.gravity * 0.02;

            if (py > this.canvas.height || px > this.canvas.width) break;
            ctx.lineTo(px, py);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw power circle
        ctx.beginPath();
        ctx.arc(this.dragEnd.x, this.dragEnd.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 107, 157, ${0.5 + powerRatio * 0.5})`;
        ctx.fill();
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
// Initialize Game
// ========================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

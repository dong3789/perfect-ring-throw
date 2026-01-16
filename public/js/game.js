// Perfect Ring Toss - Simple Canvas Game
// Complete rewrite for reliability

class RingTossGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Game state
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('ringTossBest')) || 0;
        this.isPlaying = false;
        this.gameStarted = false;

        // Ring state
        this.ring = {
            x: 0,           // -1 to 1 (center is 0)
            y: 0,           // Height above ground
            z: 0,           // Distance (0 = near, 1 = at pole)
            vx: 0,
            vy: 0,
            vz: 0,
            thrown: false
        };

        // Touch state
        this.touch = {
            active: false,
            startX: 0,
            startY: 0,
            startTime: 0,
            currentX: 0,
            currentY: 0
        };

        // Animation
        this.animationId = null;
        this.lastTime = 0;

        this.init();
    }

    init() {
        // Setup UI buttons
        document.getElementById('btn-solo')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-retry')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-home')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-back')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-online')?.addEventListener('click', () => this.showScreen('nickname-screen'));
        document.getElementById('btn-cancel')?.addEventListener('click', () => this.showScreen('menu-screen'));
        document.getElementById('btn-join')?.addEventListener('click', () => {
            alert('Online mode coming soon!');
            this.showScreen('menu-screen');
        });

        this.updateBestScore();
    }

    setupCanvas() {
        const container = document.getElementById('game-container');

        // Remove old canvas if exists
        const oldCanvas = container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();

        // Create new canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Setup touch/mouse events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    // Touch handlers
    onTouchStart(e) {
        e.preventDefault();
        if (!this.isPlaying || this.ring.thrown) return;

        const t = e.touches[0];
        this.touch.active = true;
        this.touch.startX = t.clientX;
        this.touch.startY = t.clientY;
        this.touch.currentX = t.clientX;
        this.touch.currentY = t.clientY;
        this.touch.startTime = Date.now();

        document.getElementById('game-hint').style.opacity = '0';
    }

    onTouchMove(e) {
        e.preventDefault();
        if (!this.touch.active) return;

        const t = e.touches[0];
        this.touch.currentX = t.clientX;
        this.touch.currentY = t.clientY;

        // Move ring based on horizontal drag
        const dx = this.touch.currentX - this.touch.startX;
        this.ring.x = Math.max(-1, Math.min(1, dx / 150));
    }

    onTouchEnd(e) {
        e.preventDefault();
        if (!this.touch.active) return;

        this.handleThrow();
        this.touch.active = false;
    }

    // Mouse handlers (for desktop testing)
    onMouseDown(e) {
        if (!this.isPlaying || this.ring.thrown) return;

        this.touch.active = true;
        this.touch.startX = e.clientX;
        this.touch.startY = e.clientY;
        this.touch.currentX = e.clientX;
        this.touch.currentY = e.clientY;
        this.touch.startTime = Date.now();

        document.getElementById('game-hint').style.opacity = '0';
    }

    onMouseMove(e) {
        if (!this.touch.active) return;

        this.touch.currentX = e.clientX;
        this.touch.currentY = e.clientY;

        const dx = this.touch.currentX - this.touch.startX;
        this.ring.x = Math.max(-1, Math.min(1, dx / 150));
    }

    onMouseUp(e) {
        if (!this.touch.active) return;

        this.handleThrow();
        this.touch.active = false;
    }

    handleThrow() {
        const dy = this.touch.currentY - this.touch.startY;
        const dx = this.touch.currentX - this.touch.startX;
        const dt = Date.now() - this.touch.startTime;

        // Only throw if swiped upward (dy is negative)
        if (dy < -30) {
            const speed = Math.min(Math.abs(dy) / dt * 5, 2);

            this.ring.thrown = true;
            this.ring.vx = (dx / 200) * speed;
            this.ring.vy = speed * 0.3;
            this.ring.vz = speed;
        } else {
            // Reset ring position if not thrown
            this.ring.x = 0;
        }
    }

    startGame() {
        this.showScreen('game-screen');

        // Small delay to ensure screen is visible
        setTimeout(() => {
            if (!this.gameStarted) {
                this.setupCanvas();
                this.gameStarted = true;
            } else {
                this.resizeCanvas();
            }

            this.score = 0;
            this.isPlaying = true;
            this.resetRing();
            this.updateScoreDisplay();

            document.getElementById('game-hint').style.opacity = '1';

            // Start game loop
            this.lastTime = performance.now();
            this.gameLoop();
        }, 100);
    }

    resetRing() {
        this.ring = {
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            thrown: false
        };
    }

    gameLoop() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        if (!this.ring.thrown) return;

        // Physics
        this.ring.x += this.ring.vx * dt * 2;
        this.ring.y += this.ring.vy * dt * 2;
        this.ring.z += this.ring.vz * dt;

        // Gravity
        this.ring.vy -= dt * 2;

        // Air resistance
        this.ring.vx *= 0.99;
        this.ring.vz *= 0.995;

        // Check collision with pole (pole is at z = 1)
        if (this.ring.z >= 0.9 && this.ring.z <= 1.1) {
            // Check if ring is centered (within hole tolerance)
            if (Math.abs(this.ring.x) < 0.3 && this.ring.y > -0.2 && this.ring.y < 0.8) {
                this.onSuccess();
                return;
            }
        }

        // Check miss conditions
        if (this.ring.z > 1.2 || this.ring.y < -0.5 || Math.abs(this.ring.x) > 1.5) {
            this.onMiss();
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, w, h);

        // Ground and horizon
        const horizonY = h * 0.35;
        const groundY = h * 0.85;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.05)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 10; i++) {
            const x = w * (i / 10);
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(w / 2, horizonY);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const y = groundY - (groundY - horizonY) * t;
            const spread = (1 - t * 0.7) * w / 2;
            ctx.beginPath();
            ctx.moveTo(w / 2 - spread, y);
            ctx.lineTo(w / 2 + spread, y);
            ctx.stroke();
        }

        // Ground
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, groundY, w, h - groundY);

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Draw pole (at z = 1, which is at horizon)
        this.drawPole(ctx, w, h, horizonY, groundY);

        // Draw ring
        this.drawRing(ctx, w, h, horizonY, groundY);
    }

    drawPole(ctx, w, h, horizonY, groundY) {
        // Pole position based on z=1 (at target distance)
        const poleScale = 0.4;
        const poleY = horizonY + (groundY - horizonY) * poleScale;
        const poleHeight = (groundY - horizonY) * 0.3 * poleScale;
        const poleWidth = 8;

        // Glow
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.beginPath();
        ctx.ellipse(w / 2, poleY - poleHeight, poleWidth + 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pole body
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(w / 2 - poleWidth / 2, poleY - poleHeight, poleWidth, poleHeight);

        // Pole cap
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(w / 2, poleY - poleHeight, poleWidth / 2 + 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Base
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.ellipse(w / 2, poleY, poleWidth * 1.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawRing(ctx, w, h, horizonY, groundY) {
        // Calculate ring screen position based on z
        const z = this.ring.z;
        const scale = 1 - z * 0.6; // Ring gets smaller as it goes further

        // Y position: interpolate between bottom and horizon based on z
        const baseY = groundY - 50;
        const targetY = horizonY + (groundY - horizonY) * 0.4;
        const screenY = baseY - (baseY - targetY) * z - this.ring.y * 100 * scale;

        // X position
        const screenX = w / 2 + this.ring.x * 150 * scale;

        // Ring size
        const ringRadius = 40 * scale;
        const ringThickness = 10 * scale;

        // Glow
        ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, ringRadius + 15, (ringRadius + 15) * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, ringRadius, ringRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner hole
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, ringRadius - ringThickness, (ringRadius - ringThickness) * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(screenX - 5, screenY - 3, ringRadius * 0.6, ringRadius * 0.4, -0.3, 0, Math.PI);
        ctx.stroke();
    }

    onSuccess() {
        this.ring.thrown = false;
        this.score++;
        this.updateScoreDisplay();

        // Flash effect
        this.flashScreen('#a855f7');

        // Reset for next throw
        setTimeout(() => {
            if (this.isPlaying) {
                this.resetRing();
            }
        }, 500);
    }

    onMiss() {
        this.ring.thrown = false;

        // Flash red
        this.flashScreen('#ef4444');

        // Game over
        setTimeout(() => {
            this.endGame();
        }, 500);
    }

    flashScreen(color) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            inset: 0;
            background: ${color};
            opacity: 0.3;
            pointer-events: none;
            z-index: 1000;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 100);
    }

    endGame() {
        this.isPlaying = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('ringTossBest', this.bestScore);
            document.getElementById('new-record')?.classList.add('show');
        } else {
            document.getElementById('new-record')?.classList.remove('show');
        }

        document.getElementById('final-score').textContent = this.score;
        this.updateBestScore();
        this.showScreen('gameover-screen');
    }

    updateScoreDisplay() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('best-score').textContent = this.bestScore;
    }

    updateBestScore() {
        document.getElementById('menu-best-score').textContent = this.bestScore;
        const bestEl = document.getElementById('best-score');
        if (bestEl) bestEl.textContent = this.bestScore;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
    }

    showLeaderboard() {
        this.showScreen('leaderboard-screen');
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '<div style="text-align:center;color:#71717a;padding:40px;">No scores yet</div>';
    }
}

// Start game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RingTossGame();
});

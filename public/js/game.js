// Perfect Ring Toss - PixiJS Game Engine
// 3D Perspective Ring Throwing with Visual Effects

class RingTossGame {
    constructor() {
        this.app = null;
        this.gameContainer = null;

        // Game state
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('ringTossBest')) || 0;
        this.isPlaying = false;
        this.isThrowing = false;
        this.hasThrown = false;

        // 3D World settings
        this.world = {
            groundY: 0.7,      // Ground position (0-1 of screen height)
            poleZ: 800,        // Pole distance from camera
            cameraHeight: 200, // Camera height
            fov: 400           // Field of view
        };

        // Ring properties
        this.ring = null;
        this.ringState = {
            x: 0, y: 0, z: 50,
            vx: 0, vy: 0, vz: 0,
            rotation: 0,
            rotationSpeed: 0,
            scale: 1
        };

        // Pole properties
        this.pole = null;
        this.poleState = {
            x: 0,
            baseWidth: 20,
            topWidth: 12,
            height: 180
        };

        // Touch/drag state
        this.dragStart = null;
        this.dragCurrent = null;
        this.isDragging = false;

        // Visual elements
        this.groundGraphics = null;
        this.shadowGraphics = null;
        this.particles = [];
        this.glowFilters = [];

        // Animation
        this.gameLoop = null;

        this.init();
    }

    async init() {
        // Initialize PixiJS Application
        this.app = new PIXI.Application();

        await this.app.init({
            background: '#09090b',
            resizeTo: document.getElementById('game-container'),
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        this.gameContainer = document.getElementById('game-container');
        this.gameContainer.appendChild(this.app.canvas);

        // Create game layers
        this.backgroundLayer = new PIXI.Container();
        this.gameLayer = new PIXI.Container();
        this.effectLayer = new PIXI.Container();
        this.uiLayer = new PIXI.Container();

        this.app.stage.addChild(this.backgroundLayer);
        this.app.stage.addChild(this.gameLayer);
        this.app.stage.addChild(this.effectLayer);
        this.app.stage.addChild(this.uiLayer);

        this.createBackground();
        this.createGround();
        this.createPole();
        this.createRing();
        this.createShadow();

        this.setupEventListeners();
        this.updateScoreDisplays();

        // Start render loop
        this.app.ticker.add(this.update.bind(this));

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    createBackground() {
        const { width, height } = this.app.screen;

        // Gradient background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x09090b });
        this.backgroundLayer.addChild(bg);

        // Ambient glow at top
        const ambientGlow = new PIXI.Graphics();
        ambientGlow.ellipse(width / 2, -100, width * 0.8, 300);
        ambientGlow.fill({ color: 0xa855f7, alpha: 0.05 });
        this.backgroundLayer.addChild(ambientGlow);

        // Grid lines for depth perception
        this.gridLines = new PIXI.Graphics();
        this.drawGrid();
        this.backgroundLayer.addChild(this.gridLines);
    }

    drawGrid() {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        this.gridLines.clear();

        // Perspective grid lines
        const vanishY = height * 0.3;
        const numLines = 12;

        for (let i = 0; i <= numLines; i++) {
            const x = (i / numLines) * width;
            const alpha = 0.03 + Math.abs(i - numLines / 2) / numLines * 0.02;

            this.gridLines.moveTo(x, groundY);
            this.gridLines.lineTo(width / 2, vanishY);
            this.gridLines.stroke({ width: 1, color: 0xa855f7, alpha: alpha });
        }

        // Horizontal depth lines
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const y = groundY - (groundY - vanishY) * t;
            const spreadX = (1 - t * 0.7) * width / 2;

            this.gridLines.moveTo(width / 2 - spreadX, y);
            this.gridLines.lineTo(width / 2 + spreadX, y);
            this.gridLines.stroke({ width: 1, color: 0xa855f7, alpha: 0.02 + t * 0.02 });
        }
    }

    createGround() {
        const { width, height } = this.app.screen;

        this.groundGraphics = new PIXI.Graphics();
        this.drawGround();
        this.backgroundLayer.addChild(this.groundGraphics);
    }

    drawGround() {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        this.groundGraphics.clear();

        // Ground plane with gradient effect
        const groundHeight = height - groundY;
        this.groundGraphics.rect(0, groundY, width, groundHeight);
        this.groundGraphics.fill({ color: 0x18181b, alpha: 0.8 });

        // Ground line
        this.groundGraphics.moveTo(0, groundY);
        this.groundGraphics.lineTo(width, groundY);
        this.groundGraphics.stroke({ width: 2, color: 0xa855f7, alpha: 0.3 });
    }

    createPole() {
        const { width, height } = this.app.screen;

        this.poleContainer = new PIXI.Container();
        this.gameLayer.addChild(this.poleContainer);

        this.pole = new PIXI.Graphics();
        this.poleGlow = new PIXI.Graphics();

        this.poleContainer.addChild(this.poleGlow);
        this.poleContainer.addChild(this.pole);

        this.drawPole();
    }

    drawPole() {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        // Calculate pole position with perspective
        const poleScreenPos = this.project3Dto2D(0, 0, this.world.poleZ);
        const poleScale = poleScreenPos.scale;

        const poleHeight = this.poleState.height * poleScale;
        const baseWidth = this.poleState.baseWidth * poleScale;
        const topWidth = this.poleState.topWidth * poleScale;

        const poleX = width / 2;
        const poleBaseY = groundY - 20 * poleScale;
        const poleTopY = poleBaseY - poleHeight;

        // Glow effect
        this.poleGlow.clear();
        this.poleGlow.moveTo(poleX - baseWidth / 2 - 8, poleBaseY);
        this.poleGlow.lineTo(poleX - topWidth / 2 - 6, poleTopY);
        this.poleGlow.lineTo(poleX + topWidth / 2 + 6, poleTopY);
        this.poleGlow.lineTo(poleX + baseWidth / 2 + 8, poleBaseY);
        this.poleGlow.closePath();
        this.poleGlow.fill({ color: 0xa855f7, alpha: 0.15 });

        // Main pole
        this.pole.clear();

        // Pole body (trapezoid for perspective)
        this.pole.moveTo(poleX - baseWidth / 2, poleBaseY);
        this.pole.lineTo(poleX - topWidth / 2, poleTopY);
        this.pole.lineTo(poleX + topWidth / 2, poleTopY);
        this.pole.lineTo(poleX + baseWidth / 2, poleBaseY);
        this.pole.closePath();
        this.pole.fill({ color: 0x3f3f46 });

        // Pole highlight
        this.pole.moveTo(poleX - baseWidth / 4, poleBaseY);
        this.pole.lineTo(poleX - topWidth / 4, poleTopY);
        this.pole.lineTo(poleX, poleTopY);
        this.pole.lineTo(poleX, poleBaseY);
        this.pole.closePath();
        this.pole.fill({ color: 0x52525b, alpha: 0.5 });

        // Pole cap
        const capRadius = topWidth / 2 + 4;
        this.pole.ellipse(poleX, poleTopY, capRadius, capRadius * 0.4);
        this.pole.fill({ color: 0xa855f7 });

        // Cap glow
        this.pole.ellipse(poleX, poleTopY, capRadius * 1.5, capRadius * 0.6);
        this.pole.fill({ color: 0xa855f7, alpha: 0.2 });

        // Base
        this.pole.ellipse(poleX, poleBaseY + 5, baseWidth * 0.8, baseWidth * 0.3);
        this.pole.fill({ color: 0x27272a });

        // Store pole top position for collision
        this.poleState.screenX = poleX;
        this.poleState.screenTopY = poleTopY;
        this.poleState.screenBaseY = poleBaseY;
        this.poleState.screenWidth = topWidth;
        this.poleState.scale = poleScale;
    }

    createRing() {
        this.ringContainer = new PIXI.Container();
        this.gameLayer.addChild(this.ringContainer);

        this.ringGlow = new PIXI.Graphics();
        this.ring = new PIXI.Graphics();
        this.ringInner = new PIXI.Graphics();

        this.ringContainer.addChild(this.ringGlow);
        this.ringContainer.addChild(this.ring);
        this.ringContainer.addChild(this.ringInner);

        this.resetRing();
    }

    drawRing() {
        const { width, height } = this.app.screen;

        // Project ring position to 2D
        const screenPos = this.project3Dto2D(
            this.ringState.x,
            this.ringState.y,
            this.ringState.z
        );

        const scale = screenPos.scale * this.ringState.scale;
        const ringRadius = 35 * scale;
        const ringThickness = 8 * scale;

        // Calculate tilt based on throw angle
        const tiltY = Math.cos(this.ringState.rotation) * 0.3 + 0.7;

        this.ringContainer.x = screenPos.x;
        this.ringContainer.y = screenPos.y;

        // Clear previous drawings
        this.ringGlow.clear();
        this.ring.clear();
        this.ringInner.clear();

        // Outer glow
        this.ringGlow.ellipse(0, 0, ringRadius + 15, (ringRadius + 15) * tiltY);
        this.ringGlow.fill({ color: 0xa855f7, alpha: 0.2 });

        // Main ring (torus shape approximation)
        this.ring.ellipse(0, 0, ringRadius, ringRadius * tiltY);
        this.ring.fill({ color: 0xa855f7 });

        // Inner cutout
        this.ringInner.ellipse(0, 0, ringRadius - ringThickness, (ringRadius - ringThickness) * tiltY);
        this.ringInner.fill({ color: 0x09090b });

        // Highlight
        const highlightOffset = ringThickness * 0.3;
        this.ring.ellipse(-highlightOffset, -highlightOffset * tiltY, ringRadius * 0.7, ringRadius * 0.7 * tiltY);
        this.ring.stroke({ width: 2, color: 0xc084fc, alpha: 0.5 });
    }

    createShadow() {
        this.shadowGraphics = new PIXI.Graphics();
        this.gameLayer.addChild(this.shadowGraphics);

        // Make sure shadow is behind ring but above ground
        this.gameLayer.setChildIndex(this.shadowGraphics, 0);
    }

    drawShadow() {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        this.shadowGraphics.clear();

        if (!this.isThrowing && !this.hasThrown) return;

        // Project shadow position (ring x/z but y = 0)
        const shadowPos = this.project3Dto2D(
            this.ringState.x,
            0,
            this.ringState.z
        );

        const shadowScale = shadowPos.scale;
        const shadowRadius = 30 * shadowScale;
        const shadowAlpha = Math.max(0, 0.3 - this.ringState.z / 2000);

        this.shadowGraphics.ellipse(shadowPos.x, groundY - 10 * shadowScale, shadowRadius, shadowRadius * 0.3);
        this.shadowGraphics.fill({ color: 0x000000, alpha: shadowAlpha });
    }

    project3Dto2D(x, y, z) {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        // Perspective projection
        const scale = this.world.fov / (this.world.fov + z);

        const screenX = width / 2 + x * scale;
        const screenY = groundY - (y + this.world.cameraHeight) * scale;

        return { x: screenX, y: screenY, scale };
    }

    resetRing() {
        const { width, height } = this.app.screen;

        this.ringState = {
            x: 0,
            y: 50,
            z: 50,
            vx: 0,
            vy: 0,
            vz: 0,
            rotation: 0,
            rotationSpeed: 0,
            scale: 1
        };

        this.hasThrown = false;
        this.isThrowing = false;

        this.drawRing();
        this.drawShadow();
    }

    setupEventListeners() {
        const canvas = this.app.canvas;

        // Touch events
        canvas.addEventListener('touchstart', (e) => this.onPointerDown(e.touches[0]), { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onPointerMove(e.touches[0]);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => this.onPointerUp(), { passive: false });

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        canvas.addEventListener('mouseup', () => this.onPointerUp());
        canvas.addEventListener('mouseleave', () => this.onPointerUp());

        // UI buttons
        document.getElementById('btn-solo')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-back')?.addEventListener('click', () => this.exitGame());
        document.getElementById('btn-retry')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-home')?.addEventListener('click', () => this.exitGame());

        // Leaderboard
        document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => this.hideLeaderboard());

        // Online (placeholder)
        document.getElementById('btn-online')?.addEventListener('click', () => this.showNicknameInput());
        document.getElementById('btn-cancel')?.addEventListener('click', () => this.hideNicknameInput());
        document.getElementById('btn-join')?.addEventListener('click', () => this.joinOnline());
    }

    onPointerDown(e) {
        if (!this.isPlaying || this.isThrowing || this.hasThrown) return;

        const rect = this.app.canvas.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            time: Date.now()
        };
        this.dragCurrent = { ...this.dragStart };
        this.isDragging = true;

        // Hide hint
        const hint = document.getElementById('game-hint');
        if (hint) hint.style.opacity = '0';
    }

    onPointerMove(e) {
        if (!this.isDragging) return;

        const rect = this.app.canvas.getBoundingClientRect();
        this.dragCurrent = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Visual feedback - tilt ring based on drag
        const dx = this.dragCurrent.x - this.dragStart.x;
        const dy = this.dragCurrent.y - this.dragStart.y;

        this.ringState.x = dx * 0.3;
        this.ringState.rotation = -dy * 0.01;

        this.drawRing();
    }

    onPointerUp() {
        if (!this.isDragging || !this.isPlaying) {
            this.isDragging = false;
            return;
        }

        const dx = this.dragCurrent.x - this.dragStart.x;
        const dy = this.dragCurrent.y - this.dragStart.y;
        const dt = Math.max(1, Date.now() - this.dragStart.time);

        // Only throw if swiped upward
        if (dy < -30) {
            this.throwRing(dx, dy, dt);
        } else {
            // Reset ring position if not thrown
            this.ringState.x = 0;
            this.ringState.rotation = 0;
            this.drawRing();
        }

        this.isDragging = false;
    }

    throwRing(dx, dy, dt) {
        this.isThrowing = true;
        this.hasThrown = true;

        // Calculate throw velocity
        const power = Math.min(Math.abs(dy) / dt * 10, 35);
        const direction = dx / Math.abs(dy);

        this.ringState.vx = direction * power * 1.5;
        this.ringState.vy = power * 0.6;
        this.ringState.vz = power * 25;
        this.ringState.rotationSpeed = power * 0.05;

        // Add throw particles
        this.createThrowParticles();
    }

    createThrowParticles() {
        const screenPos = this.project3Dto2D(
            this.ringState.x,
            this.ringState.y,
            this.ringState.z
        );

        for (let i = 0; i < 10; i++) {
            const particle = new PIXI.Graphics();
            particle.circle(0, 0, 3 + Math.random() * 4);
            particle.fill({ color: 0xa855f7, alpha: 0.8 });

            particle.x = screenPos.x;
            particle.y = screenPos.y;
            particle.vx = (Math.random() - 0.5) * 8;
            particle.vy = (Math.random() - 0.5) * 8 - 2;
            particle.life = 1;
            particle.decay = 0.02 + Math.random() * 0.02;

            this.effectLayer.addChild(particle);
            this.particles.push(particle);
        }
    }

    createSuccessParticles() {
        const { width, height } = this.app.screen;

        for (let i = 0; i < 30; i++) {
            const particle = new PIXI.Graphics();
            const size = 4 + Math.random() * 8;
            particle.circle(0, 0, size);
            particle.fill({ color: [0xa855f7, 0xc084fc, 0xe879f9][Math.floor(Math.random() * 3)] });

            particle.x = this.poleState.screenX;
            particle.y = this.poleState.screenTopY;

            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed - 5;
            particle.life = 1;
            particle.decay = 0.01 + Math.random() * 0.015;

            this.effectLayer.addChild(particle);
            this.particles.push(particle);
        }
    }

    createFailParticles() {
        const screenPos = this.project3Dto2D(
            this.ringState.x,
            this.ringState.y,
            this.ringState.z
        );

        for (let i = 0; i < 15; i++) {
            const particle = new PIXI.Graphics();
            particle.circle(0, 0, 3 + Math.random() * 5);
            particle.fill({ color: 0xef4444, alpha: 0.8 });

            particle.x = screenPos.x;
            particle.y = screenPos.y;

            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1;
            particle.decay = 0.02 + Math.random() * 0.02;

            this.effectLayer.addChild(particle);
            this.particles.push(particle);
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // Gravity
            p.life -= p.decay;
            p.alpha = p.life;
            p.scale.set(p.life);

            if (p.life <= 0) {
                this.effectLayer.removeChild(p);
                p.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    update(ticker) {
        if (!this.isPlaying) return;

        const delta = ticker.deltaTime;

        // Update particles
        this.updateParticles();

        if (!this.isThrowing) return;

        // Physics update
        const gravity = 0.4;
        const airResistance = 0.99;

        this.ringState.vy -= gravity * delta;
        this.ringState.vx *= airResistance;
        this.ringState.vy *= airResistance;

        this.ringState.x += this.ringState.vx * delta;
        this.ringState.y += this.ringState.vy * delta;
        this.ringState.z += this.ringState.vz * delta;
        this.ringState.rotation += this.ringState.rotationSpeed * delta;

        // Check collision with pole
        this.checkCollision();

        // Redraw
        this.drawRing();
        this.drawShadow();
    }

    checkCollision() {
        const { width, height } = this.app.screen;
        const groundY = height * this.world.groundY;

        // Check if ring passed the pole's Z position
        const poleZ = this.world.poleZ;
        const ringRadius = 35;

        // Ring is at pole depth
        if (this.ringState.z >= poleZ - 50 && this.ringState.z <= poleZ + 50) {
            const poleWidth = this.poleState.baseWidth / 2;

            // Check if ring is aligned with pole
            if (Math.abs(this.ringState.x) < ringRadius + poleWidth &&
                this.ringState.y > 50 && this.ringState.y < 250) {

                // Success! Ring landed on pole
                this.onSuccess();
                return;
            }
        }

        // Ring passed the pole or went too far
        if (this.ringState.z > poleZ + 100) {
            this.onMiss();
            return;
        }

        // Ring fell below ground
        if (this.ringState.y < -50) {
            this.onMiss();
            return;
        }

        // Ring went off screen horizontally
        if (Math.abs(this.ringState.x) > 500) {
            this.onMiss();
            return;
        }
    }

    onSuccess() {
        this.score++;
        this.updateScoreDisplays();
        this.createSuccessParticles();

        // Flash effect
        this.flashScreen(0xa855f7, 0.3);

        // Reset for next throw
        setTimeout(() => {
            if (this.isPlaying) {
                this.resetRing();
            }
        }, 500);

        this.isThrowing = false;
    }

    onMiss() {
        this.isThrowing = false;
        this.createFailParticles();

        // Flash red
        this.flashScreen(0xef4444, 0.2);

        // Game over
        setTimeout(() => {
            this.endGame();
        }, 800);
    }

    flashScreen(color, alpha) {
        const { width, height } = this.app.screen;

        const flash = new PIXI.Graphics();
        flash.rect(0, 0, width, height);
        flash.fill({ color, alpha });
        this.effectLayer.addChild(flash);

        // Fade out
        const fadeOut = () => {
            flash.alpha -= 0.05;
            if (flash.alpha <= 0) {
                this.effectLayer.removeChild(flash);
                flash.destroy();
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();
    }

    startGame() {
        this.score = 0;
        this.isPlaying = true;
        this.updateScoreDisplays();
        this.resetRing();

        this.showScreen('game-screen');

        // Show hint
        const hint = document.getElementById('game-hint');
        if (hint) {
            hint.style.opacity = '1';
            setTimeout(() => {
                hint.style.opacity = '0';
            }, 3000);
        }
    }

    endGame() {
        this.isPlaying = false;

        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('ringTossBest', this.bestScore);
            document.getElementById('new-record')?.classList.add('show');
        } else {
            document.getElementById('new-record')?.classList.remove('show');
        }

        // Update final score
        document.getElementById('final-score').textContent = this.score;

        // Show game over
        this.showScreen('gameover-screen');
        this.updateScoreDisplays();

        // Submit score to server
        this.submitScore();
    }

    exitGame() {
        this.isPlaying = false;
        this.showScreen('menu-screen');
    }

    updateScoreDisplays() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('best-score').textContent = this.bestScore;
        document.getElementById('menu-best-score').textContent = this.bestScore;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    }

    async showLeaderboard() {
        this.showScreen('leaderboard-screen');

        const listEl = document.getElementById('leaderboard-list');
        listEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

        try {
            const response = await fetch('/api/scores');
            const data = await response.json();

            if (data.leaderboard && data.leaderboard.length > 0) {
                listEl.innerHTML = data.leaderboard.map((entry, i) => `
                    <div class="leaderboard-item ${i < 3 ? 'top-' + (i + 1) : ''}">
                        <span class="rank">${entry.rank}</span>
                        <span class="name">${entry.name}</span>
                        <span class="score">${entry.score}</span>
                    </div>
                `).join('');
            } else {
                listEl.innerHTML = '<div class="leaderboard-empty">No scores yet</div>';
            }
        } catch (e) {
            listEl.innerHTML = '<div class="leaderboard-error">Failed to load</div>';
        }
    }

    hideLeaderboard() {
        this.showScreen('menu-screen');
    }

    showNicknameInput() {
        this.showScreen('nickname-screen');
        document.getElementById('nickname-input')?.focus();
    }

    hideNicknameInput() {
        this.showScreen('menu-screen');
    }

    joinOnline() {
        const nickname = document.getElementById('nickname-input')?.value.trim();
        if (!nickname) {
            document.getElementById('nickname-input')?.classList.add('error');
            setTimeout(() => {
                document.getElementById('nickname-input')?.classList.remove('error');
            }, 500);
            return;
        }

        // TODO: Implement Socket.io connection
        alert('Online mode coming soon!');
        this.hideNicknameInput();
    }

    async submitScore() {
        if (this.score === 0) return;

        const nickname = localStorage.getItem('ringTossNickname') || 'Anonymous';

        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nickname, score: this.score })
            });
        } catch (e) {
            console.log('Failed to submit score');
        }
    }

    onResize() {
        // Redraw elements on resize
        this.drawGrid();
        this.drawGround();
        this.drawPole();
        this.drawRing();
        this.drawShadow();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RingTossGame();
});

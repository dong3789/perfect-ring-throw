// Perfect Ring Toss - PixiJS Game Engine
// 3D Perspective Ring Throwing with Visual Effects

class RingTossGame {
    constructor() {
        this.app = null;
        this.gameContainer = null;
        this.initialized = false;

        // Game state
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('ringTossBest')) || 0;
        this.isPlaying = false;
        this.isThrowing = false;
        this.hasThrown = false;

        // 3D World settings
        this.world = {
            horizonY: 0.35,    // Vanishing point (horizon)
            nearGroundY: 0.88, // Ground close to camera
            poleZ: 500,        // Pole distance
            fov: 300           // Field of view
        };

        // Ring properties
        this.ringState = {
            x: 0, y: 30, z: 0,
            vx: 0, vy: 0, vz: 0,
            rotation: 0,
            rotationSpeed: 0,
            scale: 1
        };

        // Pole properties
        this.poleState = {
            x: 0,
            baseWidth: 15,
            topWidth: 8,
            height: 120
        };

        // Touch/drag state
        this.dragStart = null;
        this.dragCurrent = null;
        this.isDragging = false;

        // Visual elements
        this.particles = [];

        // Setup UI event listeners first
        this.setupUIEventListeners();
        this.updateScoreDisplays();
    }

    setupUIEventListeners() {
        // UI buttons - these work before PixiJS is initialized
        document.getElementById('btn-solo')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-back')?.addEventListener('click', () => this.exitGame());
        document.getElementById('btn-retry')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-home')?.addEventListener('click', () => this.exitGame());

        // Leaderboard
        document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => this.hideLeaderboard());

        // Online
        document.getElementById('btn-online')?.addEventListener('click', () => this.showNicknameInput());
        document.getElementById('btn-cancel')?.addEventListener('click', () => this.hideNicknameInput());
        document.getElementById('btn-join')?.addEventListener('click', () => this.joinOnline());
    }

    async initPixi() {
        if (this.initialized) return;

        this.gameContainer = document.getElementById('game-container');

        // Initialize PixiJS Application
        this.app = new PIXI.Application();

        // Get container dimensions
        const width = this.gameContainer.clientWidth || window.innerWidth;
        const height = this.gameContainer.clientHeight || window.innerHeight - 80;

        await this.app.init({
            background: 0x09090b,
            width: width,
            height: height,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

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

        this.setupGameEventListeners();

        // Start render loop
        this.app.ticker.add(this.update.bind(this));

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        this.initialized = true;
    }

    setupGameEventListeners() {
        // Use the game container for events (more reliable on mobile)
        const container = this.gameContainer;

        // Touch events
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.touches.length > 0) {
                this.onPointerDown(e.touches[0]);
            }
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.touches.length > 0) {
                this.onPointerMove(e.touches[0]);
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onPointerUp();
        }, { passive: false });

        container.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.onPointerUp();
        }, { passive: false });

        // Mouse events (for desktop testing)
        container.addEventListener('mousedown', (e) => this.onPointerDown(e));
        container.addEventListener('mousemove', (e) => this.onPointerMove(e));
        container.addEventListener('mouseup', () => this.onPointerUp());
        container.addEventListener('mouseleave', () => this.onPointerUp());
    }

    createBackground() {
        const { width, height } = this.app.screen;

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, width, height);
        bg.fill(0x09090b);
        this.backgroundLayer.addChild(bg);
        this.bg = bg;

        // Ambient glow at top
        const ambientGlow = new PIXI.Graphics();
        ambientGlow.ellipse(width / 2, -100, width * 0.8, 300);
        ambientGlow.fill({ color: 0xa855f7, alpha: 0.05 });
        this.backgroundLayer.addChild(ambientGlow);
        this.ambientGlow = ambientGlow;

        // Grid lines
        this.gridLines = new PIXI.Graphics();
        this.drawGrid();
        this.backgroundLayer.addChild(this.gridLines);
    }

    drawGrid() {
        const { width, height } = this.app.screen;
        const horizonY = height * this.world.horizonY;
        const nearGroundY = height * this.world.nearGroundY;
        const numLines = 12;

        this.gridLines.clear();

        // Perspective lines converging to horizon
        for (let i = 0; i <= numLines; i++) {
            const x = (i / numLines) * width;
            const alpha = 0.03 + Math.abs(i - numLines / 2) / numLines * 0.02;

            this.gridLines.moveTo(x, nearGroundY);
            this.gridLines.lineTo(width / 2, horizonY);
            this.gridLines.stroke({ width: 1, color: 0xa855f7, alpha: alpha });
        }

        // Horizontal depth lines
        for (let i = 0; i < 10; i++) {
            const t = i / 10;
            const y = nearGroundY - (nearGroundY - horizonY) * t;
            const spreadX = (1 - t * 0.8) * width / 2;

            this.gridLines.moveTo(width / 2 - spreadX, y);
            this.gridLines.lineTo(width / 2 + spreadX, y);
            this.gridLines.stroke({ width: 1, color: 0xa855f7, alpha: 0.02 + t * 0.03 });
        }
    }

    createGround() {
        this.groundGraphics = new PIXI.Graphics();
        this.drawGround();
        this.backgroundLayer.addChild(this.groundGraphics);
    }

    drawGround() {
        const { width, height } = this.app.screen;
        const nearGroundY = height * this.world.nearGroundY;

        this.groundGraphics.clear();

        // Ground plane below the near ground line
        this.groundGraphics.rect(0, nearGroundY, width, height - nearGroundY);
        this.groundGraphics.fill({ color: 0x18181b, alpha: 0.8 });

        // Ground line at near position
        this.groundGraphics.moveTo(0, nearGroundY);
        this.groundGraphics.lineTo(width, nearGroundY);
        this.groundGraphics.stroke({ width: 2, color: 0xa855f7, alpha: 0.3 });
    }

    createPole() {
        this.poleContainer = new PIXI.Container();
        this.gameLayer.addChild(this.poleContainer);

        this.poleGlow = new PIXI.Graphics();
        this.pole = new PIXI.Graphics();

        this.poleContainer.addChild(this.poleGlow);
        this.poleContainer.addChild(this.pole);

        this.drawPole();
    }

    drawPole() {
        const { width, height } = this.app.screen;

        // Project pole base position (at ground level y=0, at poleZ distance)
        const poleBasePos = this.project3Dto2D(0, 0, this.world.poleZ);
        // Project pole top position
        const poleTopPos = this.project3Dto2D(0, this.poleState.height, this.world.poleZ);

        const poleScale = poleBasePos.scale;
        const baseWidth = this.poleState.baseWidth * poleScale;
        const topWidth = this.poleState.topWidth * poleScale;

        const poleX = poleBasePos.x;
        const poleBaseY = poleBasePos.y;
        const poleTopY = poleTopPos.y;

        // Glow
        this.poleGlow.clear();
        this.poleGlow.moveTo(poleX - baseWidth / 2 - 8, poleBaseY);
        this.poleGlow.lineTo(poleX - topWidth / 2 - 6, poleTopY);
        this.poleGlow.lineTo(poleX + topWidth / 2 + 6, poleTopY);
        this.poleGlow.lineTo(poleX + baseWidth / 2 + 8, poleBaseY);
        this.poleGlow.closePath();
        this.poleGlow.fill({ color: 0xa855f7, alpha: 0.15 });

        // Pole body
        this.pole.clear();
        this.pole.moveTo(poleX - baseWidth / 2, poleBaseY);
        this.pole.lineTo(poleX - topWidth / 2, poleTopY);
        this.pole.lineTo(poleX + topWidth / 2, poleTopY);
        this.pole.lineTo(poleX + baseWidth / 2, poleBaseY);
        this.pole.closePath();
        this.pole.fill(0x3f3f46);

        // Highlight
        this.pole.moveTo(poleX - baseWidth / 4, poleBaseY);
        this.pole.lineTo(poleX - topWidth / 4, poleTopY);
        this.pole.lineTo(poleX, poleTopY);
        this.pole.lineTo(poleX, poleBaseY);
        this.pole.closePath();
        this.pole.fill({ color: 0x52525b, alpha: 0.5 });

        // Pole cap
        const capRadius = topWidth / 2 + 4;
        this.pole.ellipse(poleX, poleTopY, capRadius, capRadius * 0.4);
        this.pole.fill(0xa855f7);

        // Cap glow
        this.pole.ellipse(poleX, poleTopY, capRadius * 1.5, capRadius * 0.6);
        this.pole.fill({ color: 0xa855f7, alpha: 0.2 });

        // Base
        this.pole.ellipse(poleX, poleBaseY + 5, baseWidth * 0.8, baseWidth * 0.3);
        this.pole.fill(0x27272a);

        // Store for collision
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
        const screenPos = this.project3Dto2D(
            this.ringState.x,
            this.ringState.y,
            this.ringState.z
        );

        const scale = screenPos.scale * this.ringState.scale;
        const ringRadius = 35 * scale;
        const ringThickness = 8 * scale;
        const tiltY = Math.cos(this.ringState.rotation) * 0.3 + 0.7;

        this.ringContainer.x = screenPos.x;
        this.ringContainer.y = screenPos.y;

        this.ringGlow.clear();
        this.ring.clear();
        this.ringInner.clear();

        // Glow
        this.ringGlow.ellipse(0, 0, ringRadius + 15, (ringRadius + 15) * tiltY);
        this.ringGlow.fill({ color: 0xa855f7, alpha: 0.2 });

        // Main ring
        this.ring.ellipse(0, 0, ringRadius, ringRadius * tiltY);
        this.ring.fill(0xa855f7);

        // Inner cutout
        this.ringInner.ellipse(0, 0, ringRadius - ringThickness, (ringRadius - ringThickness) * tiltY);
        this.ringInner.fill(0x09090b);

        // Highlight
        const highlightOffset = ringThickness * 0.3;
        this.ring.ellipse(-highlightOffset, -highlightOffset * tiltY, ringRadius * 0.7, ringRadius * 0.7 * tiltY);
        this.ring.stroke({ width: 2, color: 0xc084fc, alpha: 0.5 });
    }

    createShadow() {
        this.shadowGraphics = new PIXI.Graphics();
        this.gameLayer.addChild(this.shadowGraphics);
        this.gameLayer.setChildIndex(this.shadowGraphics, 0);
    }

    drawShadow() {
        const { width, height } = this.app.screen;

        this.shadowGraphics.clear();

        if (!this.isThrowing && !this.hasThrown) return;

        // Project shadow at ground level (y=0) at ring's z position
        const shadowPos = this.project3Dto2D(this.ringState.x, 0, this.ringState.z);
        const shadowScale = shadowPos.scale;
        const shadowRadius = 25 * shadowScale;
        const shadowAlpha = Math.max(0, 0.4 - this.ringState.z / 1000);

        this.shadowGraphics.ellipse(shadowPos.x, shadowPos.y, shadowRadius, shadowRadius * 0.3);
        this.shadowGraphics.fill({ color: 0x000000, alpha: shadowAlpha });
    }

    project3Dto2D(x, y, z) {
        const { width, height } = this.app.screen;

        const horizonY = height * this.world.horizonY;
        const nearGroundY = height * this.world.nearGroundY;

        // Perspective scale (1 at z=0, decreases as z increases)
        const scale = this.world.fov / (this.world.fov + z);

        // X: centered, scaled by depth
        const screenX = width / 2 + x * scale;

        // Y: interpolate from nearGround to horizon based on depth
        // Close objects (high scale) are at bottom, far objects approach horizon
        const groundAtDepth = horizonY + (nearGroundY - horizonY) * scale;
        const screenY = groundAtDepth - y * scale;

        return { x: screenX, y: screenY, scale };
    }

    resetRing() {
        this.ringState = {
            x: 0, y: 30, z: 0,
            vx: 0, vy: 0, vz: 0,
            rotation: 0, rotationSpeed: 0, scale: 1
        };
        this.hasThrown = false;
        this.isThrowing = false;
        this.drawRing();
        this.drawShadow();
    }

    onPointerDown(e) {
        if (!this.isPlaying || this.isThrowing || this.hasThrown) return;

        const rect = this.gameContainer.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            time: Date.now()
        };
        this.dragCurrent = { ...this.dragStart };
        this.isDragging = true;

        const hint = document.getElementById('game-hint');
        if (hint) hint.style.opacity = '0';
    }

    onPointerMove(e) {
        if (!this.isDragging) return;

        const rect = this.gameContainer.getBoundingClientRect();
        this.dragCurrent = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const dx = this.dragCurrent.x - this.dragStart.x;
        const dy = this.dragCurrent.y - this.dragStart.y;

        // Move ring horizontally based on drag
        this.ringState.x = dx * 0.5;
        // Tilt ring based on vertical drag
        this.ringState.rotation = Math.max(-0.5, Math.min(0.5, -dy * 0.005));
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

        if (dy < -30) {
            this.throwRing(dx, dy, dt);
        } else {
            this.ringState.x = 0;
            this.ringState.rotation = 0;
            this.drawRing();
        }

        this.isDragging = false;
    }

    throwRing(dx, dy, dt) {
        this.isThrowing = true;
        this.hasThrown = true;

        // Calculate throw power from swipe speed
        const swipeSpeed = Math.abs(dy) / dt;
        const power = Math.min(swipeSpeed * 8, 30);
        const direction = dx / (Math.abs(dy) + 1);

        // Horizontal movement based on swipe direction
        this.ringState.vx = direction * power * 0.8;
        // Arc upward
        this.ringState.vy = power * 0.4;
        // Forward velocity (towards pole)
        this.ringState.vz = power * 18;
        // Spin
        this.ringState.rotationSpeed = power * 0.03;

        this.createThrowParticles();
    }

    createThrowParticles() {
        const screenPos = this.project3Dto2D(
            this.ringState.x, this.ringState.y, this.ringState.z
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
        for (let i = 0; i < 30; i++) {
            const particle = new PIXI.Graphics();
            const size = 4 + Math.random() * 8;
            const colors = [0xa855f7, 0xc084fc, 0xe879f9];
            particle.circle(0, 0, size);
            particle.fill(colors[Math.floor(Math.random() * 3)]);

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
            this.ringState.x, this.ringState.y, this.ringState.z
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
            p.vy += 0.3;
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
        this.updateParticles();

        if (!this.isThrowing) return;

        const gravity = 0.4;
        const airResistance = 0.99;

        this.ringState.vy -= gravity * delta;
        this.ringState.vx *= airResistance;
        this.ringState.vy *= airResistance;

        this.ringState.x += this.ringState.vx * delta;
        this.ringState.y += this.ringState.vy * delta;
        this.ringState.z += this.ringState.vz * delta;
        this.ringState.rotation += this.ringState.rotationSpeed * delta;

        this.checkCollision();
        this.drawRing();
        this.drawShadow();
    }

    checkCollision() {
        const poleZ = this.world.poleZ;
        const ringInnerRadius = 20; // Inner radius of ring (hole size)
        const poleRadius = this.poleState.topWidth / 2;

        // Check if ring is near the pole's Z position
        if (this.ringState.z >= poleZ - 40 && this.ringState.z <= poleZ + 40) {
            // Check if ring hole aligns with pole (X close to center)
            // and ring is at right height (above ground, below pole top)
            if (Math.abs(this.ringState.x) < ringInnerRadius + poleRadius &&
                this.ringState.y > 20 && this.ringState.y < this.poleState.height + 30) {
                this.onSuccess();
                return;
            }
        }

        // Miss conditions:
        // - Ring passed the pole
        // - Ring fell to ground
        // - Ring went too far sideways
        if (this.ringState.z > poleZ + 80 ||
            this.ringState.y < -20 ||
            Math.abs(this.ringState.x) > 300) {
            this.onMiss();
        }
    }

    onSuccess() {
        this.score++;
        this.updateScoreDisplays();
        this.createSuccessParticles();
        this.flashScreen(0xa855f7, 0.3);

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
        this.flashScreen(0xef4444, 0.2);

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

    async startGame() {
        // Show game screen first
        this.showScreen('game-screen');

        // Wait a frame for CSS to apply
        await new Promise(r => setTimeout(r, 50));

        // Initialize PixiJS if not done
        if (!this.initialized) {
            await this.initPixi();
        } else {
            // Resize in case dimensions changed
            this.onResize();
        }

        this.score = 0;
        this.isPlaying = true;
        this.updateScoreDisplays();
        this.resetRing();

        const hint = document.getElementById('game-hint');
        if (hint) {
            hint.style.opacity = '1';
            setTimeout(() => { hint.style.opacity = '0'; }, 3000);
        }
    }

    endGame() {
        this.isPlaying = false;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('ringTossBest', this.bestScore);
            document.getElementById('new-record')?.classList.add('show');
        } else {
            document.getElementById('new-record')?.classList.remove('show');
        }

        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover-screen');
        this.updateScoreDisplays();
        this.submitScore();
    }

    exitGame() {
        this.isPlaying = false;
        this.showScreen('menu-screen');
    }

    updateScoreDisplays() {
        const current = document.getElementById('current-score');
        const best = document.getElementById('best-score');
        const menuBest = document.getElementById('menu-best-score');

        if (current) current.textContent = this.score;
        if (best) best.textContent = this.bestScore;
        if (menuBest) menuBest.textContent = this.bestScore;
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
        if (!this.app) return;

        const container = document.getElementById('game-container');
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight - 80;

        this.app.renderer.resize(width, height);

        // Redraw all elements
        if (this.bg) {
            this.bg.clear();
            this.bg.rect(0, 0, width, height);
            this.bg.fill(0x09090b);
        }

        if (this.ambientGlow) {
            this.ambientGlow.clear();
            this.ambientGlow.ellipse(width / 2, -100, width * 0.8, 300);
            this.ambientGlow.fill({ color: 0xa855f7, alpha: 0.05 });
        }

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

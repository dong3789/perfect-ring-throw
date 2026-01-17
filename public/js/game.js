// Perfect Ring Toss - Ultimate Edition
// Matter.js Physics + Particle System + Visual Effects

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // 배경 파티클 (떠다니는 빛)
    createBackgroundParticles(width, height, count = 50) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'background',
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.3 - 0.2,
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.5 + 0.1,
                hue: Math.random() * 60 + 250, // 보라-파랑 계열
                life: Infinity,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    // 성공 폭죽 효과
    createFirework(x, y, color = '#a855f7') {
        const particleCount = 60;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = Math.random() * 8 + 4;
            const hue = Math.random() * 60 + 270; // 보라-핑크 계열

            this.particles.push({
                type: 'firework',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                alpha: 1,
                hue: hue,
                life: 60 + Math.random() * 30,
                gravity: 0.15,
                friction: 0.98
            });
        }

        // 스파클 추가
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                type: 'sparkle',
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                size: Math.random() * 6 + 2,
                alpha: 1,
                hue: 50, // 금색
                life: 40 + Math.random() * 20,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }

    // 실패 시 파편 효과
    createFailParticles(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;

            this.particles.push({
                type: 'debris',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: Math.random() * 8 + 4,
                alpha: 1,
                hue: 0, // 빨강
                life: 50 + Math.random() * 30,
                gravity: 0.25,
                friction: 0.97,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.4
            });
        }
    }

    // 링 트레일 효과
    createTrail(x, y, vx, vy) {
        this.particles.push({
            type: 'trail',
            x: x,
            y: y,
            vx: vx * 0.1,
            vy: vy * 0.1,
            size: 15 + Math.random() * 10,
            alpha: 0.6,
            hue: 280,
            life: 20,
            shrink: 0.92
        });
    }

    // 스코어 팝업
    createScorePopup(x, y, score, isCombo = false) {
        this.particles.push({
            type: 'score',
            x: x,
            y: y,
            vy: -2,
            text: isCombo ? `+${score} COMBO!` : `+${score}`,
            alpha: 1,
            scale: isCombo ? 1.5 : 1,
            life: 60,
            isCombo: isCombo
        });
    }

    update(width, height) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'background') {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.05;
                p.alpha = (Math.sin(p.pulse) * 0.3 + 0.4) * 0.5;

                // 화면 밖으로 나가면 재배치
                if (p.y < -10) p.y = height + 10;
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
            } else if (p.type === 'firework' || p.type === 'debris') {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.friction;
                p.vy *= p.friction;
                p.alpha = p.life / 60;
                p.life--;
                if (p.rotation !== undefined) p.rotation += p.rotationSpeed;
            } else if (p.type === 'sparkle') {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha = p.life / 40;
                p.life--;
                p.rotation += p.rotationSpeed;
                p.size *= 0.97;
            } else if (p.type === 'trail') {
                p.x += p.vx;
                p.y += p.vy;
                p.size *= p.shrink;
                p.alpha *= 0.9;
                p.life--;
            } else if (p.type === 'score') {
                p.y += p.vy;
                p.vy *= 0.95;
                p.alpha = Math.min(1, p.life / 30);
                p.scale += 0.01;
                p.life--;
            }

            // 수명이 다한 파티클 제거 (배경 제외)
            if (p.life !== Infinity && p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();

            if (p.type === 'background') {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'firework') {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.alpha})`);
                gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, ${p.alpha * 0.5})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'sparkle') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
                // 별 모양
                this.drawStar(ctx, 0, 0, 4, p.size, p.size * 0.4);
                ctx.fill();
            } else if (p.type === 'debris') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = `hsla(${p.hue}, 70%, 50%, ${p.alpha})`;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            } else if (p.type === 'trail') {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.5})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'score') {
                ctx.font = `bold ${24 * p.scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // 그림자
                ctx.fillStyle = `rgba(0, 0, 0, ${p.alpha * 0.5})`;
                ctx.fillText(p.text, p.x + 2, p.y + 2);

                // 텍스트
                if (p.isCombo) {
                    const gradient = ctx.createLinearGradient(p.x - 50, p.y, p.x + 50, p.y);
                    gradient.addColorStop(0, `hsla(45, 100%, 60%, ${p.alpha})`);
                    gradient.addColorStop(0.5, `hsla(35, 100%, 70%, ${p.alpha})`);
                    gradient.addColorStop(1, `hsla(45, 100%, 60%, ${p.alpha})`);
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = `hsla(280, 100%, 80%, ${p.alpha})`;
                }
                ctx.fillText(p.text, p.x, p.y);
            }

            ctx.restore();
        }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }
}

class RingTossGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Game state
        this.score = 0;
        this.combo = 0;
        this.bestScore = parseInt(localStorage.getItem('ringTossBest')) || 0;
        this.isPlaying = false;
        this.gameStarted = false;

        // Ring state (3D simulation)
        this.ring = {
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            rotation: 0,
            rotationSpeed: 0,
            thrown: false,
            landed: false,
            wobble: 0,
            wobbleSpeed: 0
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

        // Visual effects
        this.particles = new ParticleSystem();
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.glowIntensity = 0;
        this.poleGlow = 0;
        this.time = 0;

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

        // Initialize background particles
        this.particles.createBackgroundParticles(this.width, this.height, 60);

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
        this.glowIntensity = 0.5;
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
        this.glowIntensity = 0.3 + Math.abs(this.ring.x) * 0.5;
    }

    onTouchEnd(e) {
        e.preventDefault();
        if (!this.touch.active) return;

        this.handleThrow();
        this.touch.active = false;
    }

    // Mouse handlers
    onMouseDown(e) {
        if (!this.isPlaying || this.ring.thrown) return;

        this.touch.active = true;
        this.touch.startX = e.clientX;
        this.touch.startY = e.clientY;
        this.touch.currentX = e.clientX;
        this.touch.currentY = e.clientY;
        this.touch.startTime = Date.now();

        document.getElementById('game-hint').style.opacity = '0';
        this.glowIntensity = 0.5;
    }

    onMouseMove(e) {
        if (!this.touch.active) return;

        this.touch.currentX = e.clientX;
        this.touch.currentY = e.clientY;

        const dx = this.touch.currentX - this.touch.startX;
        this.ring.x = Math.max(-1, Math.min(1, dx / 150));
        this.glowIntensity = 0.3 + Math.abs(this.ring.x) * 0.5;
    }

    onMouseUp(e) {
        if (!this.touch.active) return;

        this.handleThrow();
        this.touch.active = false;
    }

    handleThrow() {
        const dy = this.touch.currentY - this.touch.startY;
        const dx = this.touch.currentX - this.touch.startX;
        const dt = Math.max(Date.now() - this.touch.startTime, 1);

        // Only throw if swiped upward
        if (dy < -30) {
            const speed = Math.min(Math.abs(dy) / dt * 5, 2.5);

            this.ring.thrown = true;
            this.ring.vx = (dx / 200) * speed;
            this.ring.vy = speed * 0.35;
            this.ring.vz = speed;
            this.ring.rotationSpeed = (Math.random() - 0.5) * 0.3;

            this.glowIntensity = 1;
            this.triggerScreenShake(3);
        } else {
            this.ring.x = 0;
            this.glowIntensity = 0;
        }
    }

    triggerScreenShake(intensity) {
        this.screenShake.intensity = intensity;
    }

    startGame() {
        this.showScreen('game-screen');

        setTimeout(() => {
            if (!this.gameStarted) {
                this.setupCanvas();
                this.gameStarted = true;
            } else {
                this.resizeCanvas();
                // Re-init background particles
                this.particles.particles = this.particles.particles.filter(p => p.type !== 'background');
                this.particles.createBackgroundParticles(this.width, this.height, 60);
            }

            this.score = 0;
            this.combo = 0;
            this.isPlaying = true;
            this.resetRing();
            this.updateScoreDisplay();

            document.getElementById('game-hint').style.opacity = '1';

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
            rotation: 0,
            rotationSpeed: 0,
            thrown: false,
            landed: false,
            wobble: 0,
            wobbleSpeed: 0
        };
        this.glowIntensity = 0;
    }

    gameLoop() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        // Update particles
        this.particles.update(this.width, this.height);

        // Update screen shake
        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 2;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 2;
            this.screenShake.intensity *= 0.9;
            if (this.screenShake.intensity < 0.1) this.screenShake.intensity = 0;
        }

        // Update glow
        this.glowIntensity *= 0.95;
        this.poleGlow = 0.5 + Math.sin(this.time * 3) * 0.2;

        if (!this.ring.thrown) return;

        // Ring landed and wobbling
        if (this.ring.landed) {
            this.ring.wobble += this.ring.wobbleSpeed;
            this.ring.wobbleSpeed *= 0.95;
            this.ring.rotation = Math.sin(this.ring.wobble) * this.ring.wobbleSpeed * 5;

            if (Math.abs(this.ring.wobbleSpeed) < 0.01) {
                // Wobble finished, next ring
                setTimeout(() => {
                    if (this.isPlaying) {
                        this.resetRing();
                        document.getElementById('game-hint').style.opacity = '1';
                    }
                }, 300);
                this.ring.landed = false;
                this.ring.thrown = false;
            }
            return;
        }

        // Create trail effect
        const screenPos = this.getScreenPosition();
        if (Math.random() < 0.5) {
            this.particles.createTrail(screenPos.x, screenPos.y, this.ring.vx * 50, this.ring.vy * 50);
        }

        // Physics with Matter.js-like simulation
        this.ring.x += this.ring.vx * dt * 2;
        this.ring.y += this.ring.vy * dt * 2;
        this.ring.z += this.ring.vz * dt;
        this.ring.rotation += this.ring.rotationSpeed;

        // Gravity (stronger for more arc)
        this.ring.vy -= dt * 2.5;

        // Air resistance
        this.ring.vx *= 0.99;
        this.ring.vz *= 0.995;
        this.ring.rotationSpeed *= 0.99;

        // Check collision with pole
        if (this.ring.z >= 0.85 && this.ring.z <= 1.15) {
            const tolerance = 0.35 - this.combo * 0.02; // 콤보가 높을수록 어려워짐
            if (Math.abs(this.ring.x) < Math.max(tolerance, 0.15) && this.ring.y > -0.3 && this.ring.y < 0.9) {
                this.onSuccess();
                return;
            }
        }

        // Check miss conditions
        if (this.ring.z > 1.3 || this.ring.y < -0.6 || Math.abs(this.ring.x) > 1.5) {
            this.onMiss();
        }
    }

    getScreenPosition() {
        const w = this.width;
        const h = this.height;
        const horizonY = h * 0.35;
        const groundY = h * 0.85;

        const z = this.ring.z;
        const scale = 1 - z * 0.6;

        const baseY = groundY - 50;
        const targetY = horizonY + (groundY - horizonY) * 0.4;
        const screenY = baseY - (baseY - targetY) * z - this.ring.y * 100 * scale;
        const screenX = w / 2 + this.ring.x * 150 * scale;

        return { x: screenX, y: screenY, scale };
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.translate(this.screenShake.x, this.screenShake.y);

        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
        bgGradient.addColorStop(0, '#0a0a0f');
        bgGradient.addColorStop(0.5, '#0d0d15');
        bgGradient.addColorStop(1, '#12121a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(-10, -10, w + 20, h + 20);

        // Draw background particles (behind everything)
        const bgParticles = this.particles.particles.filter(p => p.type === 'background');
        ctx.save();
        for (const p of bgParticles) {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        const horizonY = h * 0.35;
        const groundY = h * 0.85;

        // Animated grid lines
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.03 + Math.sin(this.time * 2) * 0.01})`;
        ctx.lineWidth = 1;

        for (let i = 0; i <= 12; i++) {
            const x = w * (i / 12);
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(w / 2, horizonY);
            ctx.stroke();
        }

        // Horizontal perspective lines
        for (let i = 0; i < 10; i++) {
            const t = i / 10;
            const y = groundY - (groundY - horizonY) * t;
            const spread = (1 - t * 0.7) * w / 2;
            const alpha = 0.02 + (1 - t) * 0.03;
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(w / 2 - spread, y);
            ctx.lineTo(w / 2 + spread, y);
            ctx.stroke();
        }

        // Ambient glow at horizon
        const ambientGlow = ctx.createRadialGradient(w / 2, horizonY, 0, w / 2, horizonY, w * 0.5);
        ambientGlow.addColorStop(0, `rgba(168, 85, 247, ${0.08 + Math.sin(this.time) * 0.02})`);
        ambientGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = ambientGlow;
        ctx.fillRect(0, 0, w, h);

        // Ground with gradient
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, h);
        groundGradient.addColorStop(0, '#18181b');
        groundGradient.addColorStop(1, '#0f0f12');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground line with glow
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + Math.sin(this.time * 2) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw pole
        this.drawPole(ctx, w, h, horizonY, groundY);

        // Draw ring
        this.drawRing(ctx, w, h, horizonY, groundY);

        // Draw other particles (fireworks, trails, etc.)
        const otherParticles = this.particles.particles.filter(p => p.type !== 'background');
        ctx.save();
        for (const p of otherParticles) {
            this.drawParticle(ctx, p);
        }
        ctx.restore();

        ctx.restore();
    }

    drawParticle(ctx, p) {
        ctx.save();

        if (p.type === 'firework') {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${p.alpha})`);
            gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 60%, ${p.alpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'sparkle') {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.alpha})`;
            this.drawStar(ctx, 0, 0, 4, p.size, p.size * 0.4);
        } else if (p.type === 'debris') {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 50%, ${p.alpha})`;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.5);
        } else if (p.type === 'trail') {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 75%, ${p.alpha * 0.6})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'score') {
            ctx.font = `bold ${24 * p.scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = `rgba(0, 0, 0, ${p.alpha * 0.5})`;
            ctx.fillText(p.text, p.x + 2, p.y + 2);

            if (p.isCombo) {
                const gradient = ctx.createLinearGradient(p.x - 50, p.y, p.x + 50, p.y);
                gradient.addColorStop(0, `hsla(45, 100%, 60%, ${p.alpha})`);
                gradient.addColorStop(0.5, `hsla(35, 100%, 75%, ${p.alpha})`);
                gradient.addColorStop(1, `hsla(45, 100%, 60%, ${p.alpha})`);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = `hsla(280, 100%, 80%, ${p.alpha})`;
            }
            ctx.fillText(p.text, p.x, p.y);
        }

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    drawPole(ctx, w, h, horizonY, groundY) {
        const poleScale = 0.4;
        const poleY = horizonY + (groundY - horizonY) * poleScale;
        const poleHeight = (groundY - horizonY) * 0.35 * poleScale;
        const poleWidth = 10;

        // Pole glow (pulsing)
        const glowSize = 25 + Math.sin(this.time * 3) * 5;
        const poleGlowGradient = ctx.createRadialGradient(
            w / 2, poleY - poleHeight, 0,
            w / 2, poleY - poleHeight, glowSize
        );
        poleGlowGradient.addColorStop(0, `rgba(168, 85, 247, ${0.4 * this.poleGlow})`);
        poleGlowGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = poleGlowGradient;
        ctx.beginPath();
        ctx.arc(w / 2, poleY - poleHeight, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Pole shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(w / 2 + 5, poleY + 3, poleWidth * 1.2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pole body with gradient
        const poleGradient = ctx.createLinearGradient(w / 2 - poleWidth, poleY, w / 2 + poleWidth, poleY);
        poleGradient.addColorStop(0, '#2a2a30');
        poleGradient.addColorStop(0.3, '#4a4a55');
        poleGradient.addColorStop(0.7, '#4a4a55');
        poleGradient.addColorStop(1, '#2a2a30');
        ctx.fillStyle = poleGradient;
        ctx.fillRect(w / 2 - poleWidth / 2, poleY - poleHeight, poleWidth, poleHeight);

        // Pole highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(w / 2 - poleWidth / 2 + 2, poleY - poleHeight, 2, poleHeight);

        // Pole cap (with glow effect)
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;

        const capGradient = ctx.createRadialGradient(
            w / 2, poleY - poleHeight, 0,
            w / 2, poleY - poleHeight, poleWidth
        );
        capGradient.addColorStop(0, '#c084fc');
        capGradient.addColorStop(0.5, '#a855f7');
        capGradient.addColorStop(1, '#7c3aed');
        ctx.fillStyle = capGradient;
        ctx.beginPath();
        ctx.ellipse(w / 2, poleY - poleHeight, poleWidth / 2 + 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Base
        const baseGradient = ctx.createRadialGradient(w / 2, poleY, 0, w / 2, poleY, poleWidth * 2);
        baseGradient.addColorStop(0, '#3f3f46');
        baseGradient.addColorStop(1, '#27272a');
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.ellipse(w / 2, poleY, poleWidth * 1.8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawRing(ctx, w, h, horizonY, groundY) {
        const z = this.ring.z;
        const scale = 1 - z * 0.6;

        const baseY = groundY - 50;
        const targetY = horizonY + (groundY - horizonY) * 0.4;
        const screenY = baseY - (baseY - targetY) * z - this.ring.y * 100 * scale;
        const screenX = w / 2 + this.ring.x * 150 * scale;

        const ringRadius = 45 * scale;
        const ringThickness = 12 * scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.ring.rotation);

        // Ring outer glow (dynamic based on state)
        const glowIntensity = this.ring.thrown ? 0.6 : (0.3 + this.glowIntensity * 0.4);
        const glowSize = ringRadius + 20 + Math.sin(this.time * 5) * 3;

        const outerGlow = ctx.createRadialGradient(0, 0, ringRadius - 5, 0, 0, glowSize);
        outerGlow.addColorStop(0, `rgba(168, 85, 247, ${glowIntensity * 0.5})`);
        outerGlow.addColorStop(0.5, `rgba(168, 85, 247, ${glowIntensity * 0.2})`);
        outerGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.ellipse(0, 0, glowSize, glowSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ring shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(3, 5, ringRadius, ringRadius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring with gradient
        const ringGradient = ctx.createLinearGradient(-ringRadius, -ringRadius, ringRadius, ringRadius);
        ringGradient.addColorStop(0, '#c084fc');
        ringGradient.addColorStop(0.3, '#a855f7');
        ringGradient.addColorStop(0.7, '#9333ea');
        ringGradient.addColorStop(1, '#7c3aed');
        ctx.fillStyle = ringGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner hole
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius - ringThickness, (ringRadius - ringThickness) * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ring highlight (3D effect)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-ringRadius * 0.15, -ringRadius * 0.1, ringRadius * 0.5, ringRadius * 0.3, -0.4, Math.PI * 0.8, Math.PI * 1.8);
        ctx.stroke();

        // Secondary highlight
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius - ringThickness / 2, (ringRadius - ringThickness / 2) * 0.7, 0, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        ctx.restore();
    }

    onSuccess() {
        this.combo++;
        const points = this.combo;
        this.score += points;
        this.updateScoreDisplay();

        // Get ring position for effects
        const screenPos = this.getScreenPosition();

        // Create firework effect
        this.particles.createFirework(screenPos.x, screenPos.y);

        // Create score popup
        this.particles.createScorePopup(screenPos.x, screenPos.y - 50, points, this.combo >= 3);

        // Screen shake (stronger with combo)
        this.triggerScreenShake(5 + this.combo * 2);

        // Start wobble animation
        this.ring.landed = true;
        this.ring.wobble = 0;
        this.ring.wobbleSpeed = 0.5 + Math.random() * 0.3;
        this.ring.vx = 0;
        this.ring.vy = 0;
        this.ring.vz = 0;

        // Flash effect (through CSS or overlay)
        this.flashScreen('#a855f7', 0.2);
    }

    onMiss() {
        // Get ring position for effects
        const screenPos = this.getScreenPosition();

        // Create debris particles
        this.particles.createFailParticles(screenPos.x, screenPos.y);

        // Reset combo
        this.combo = 0;

        // Screen shake
        this.triggerScreenShake(10);

        // Flash red
        this.flashScreen('#ef4444', 0.3);

        // Game over after delay
        setTimeout(() => {
            this.endGame();
        }, 800);
    }

    flashScreen(color, alpha = 0.3) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            inset: 0;
            background: ${color};
            opacity: ${alpha};
            pointer-events: none;
            z-index: 1000;
            transition: opacity 0.4s ease-out;
        `;
        document.body.appendChild(flash);

        requestAnimationFrame(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 400);
        });
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
        const scoreEl = document.getElementById('current-score');
        if (scoreEl) {
            scoreEl.textContent = this.score;
            // Add pop animation
            scoreEl.style.transform = 'scale(1.2)';
            setTimeout(() => {
                scoreEl.style.transform = 'scale(1)';
            }, 100);
        }
        document.getElementById('best-score').textContent = this.bestScore;

        // Update combo display
        const comboEl = document.getElementById('combo-text');
        if (comboEl) {
            if (this.combo >= 2) {
                comboEl.textContent = `${this.combo}x COMBO!`;
                comboEl.style.animation = 'none';
                comboEl.offsetHeight; // Trigger reflow
                comboEl.style.animation = 'combo-pulse 0.5s ease-out';
            } else {
                comboEl.textContent = '';
            }
        }
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
        list.innerHTML = '<div style="text-align:center;color:#71717a;padding:40px;">Coming soon!</div>';
    }
}

// Start game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RingTossGame();
});

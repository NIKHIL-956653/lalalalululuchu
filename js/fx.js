/* js/fx.js */

// 1. SETUP HIGH-PERFORMANCE CANVAS LAYER
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
canvas.id = "fxCanvas";
Object.assign(canvas.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "9999"
});
document.body.appendChild(canvas);

// 2. SETUP FLASH OVERLAY
const flashOverlay = document.createElement("div");
flashOverlay.id = "flash-overlay";
Object.assign(flashOverlay.style, {
    position: "fixed", top: "0", left: "0",
    width: "100vw", height: "100vh",
    pointerEvents: "none", zIndex: "9000",
    backgroundColor: "white", opacity: "0",
    transition: "opacity 0.1s ease-out",
    mixBlendMode: "overlay"
});
document.body.appendChild(flashOverlay);

// PARTICLE SYSTEM DATA
let particles = [];
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resize);
resize();

// CORE ANIMATION LOOP
function updateFX() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.96; // Shrink as they fly

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = isMobile ? 0 : 10; // Disable shadows on mobile for speed
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    requestAnimationFrame(updateFX);
}
requestAnimationFrame(updateFX);

export function spawnParticles(x, y, color) {
    const count = isMobile ? 12 : 24; 
    const baseSize = isMobile ? 4 : 3;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 4;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            size: baseSize + Math.random() * 2,
            color: color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

export function triggerShake() {
    const board = document.querySelector('.board');
    if (!board) return;
    if (navigator.vibrate) navigator.vibrate(20); 
    board.classList.remove('shake-active');
    void board.offsetWidth; 
    board.classList.add('shake-active');
    setTimeout(() => board.classList.remove('shake-active'), 200);
}

// Cyberpunk Glitch Effect
export function triggerGlitch() {
    const board = document.querySelector('.board');
    if (!board || !document.body.classList.contains('theme-cyberpunk')) return;
    board.style.filter = `hue-rotate(${Math.random() * 90}deg) brightness(1.5)`;
    board.style.transform = `translate3d(${Math.random() * 4 - 2}px, 0, 0) skew(${Math.random() * 2 - 1}deg)`;
    setTimeout(() => {
        board.style.filter = '';
        board.style.transform = '';
    }, 150);
}

// Magma Heat Surge Effect
export function triggerHeat() {
    const board = document.querySelector('.board');
    if (!board || !document.body.classList.contains('theme-magma')) return;
    board.style.filter = `contrast(1.2) brightness(1.3) saturate(1.5)`;
    board.style.transform = `scale(1.01)`;
    triggerFlash('#ff4500'); 
    setTimeout(() => {
        board.style.filter = '';
        board.style.transform = '';
    }, 200);
}

export function triggerFlash(color = "white") {
    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.opacity = "0.4";
    setTimeout(() => flashOverlay.style.opacity = "0", 100);
}

export function setBackgroundPulse(color) {
    document.documentElement.style.setProperty('--glow', color);
}

// Victory screen handles Matrix, Cyber, and Magma
export function startCelebration() {
    const isCyber = document.body.classList.contains('theme-cyberpunk');
    const isMagma = document.body.classList.contains('theme-magma');
    let color = isCyber ? '#fcee0a' : (isMagma ? '#ff3300' : '#00ff41');

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            spawnParticles(Math.random() * window.innerWidth, Math.random() * window.innerHeight, color); 
            if (isCyber && i % 10 === 0) triggerFlash('#00f0ff');
            if (isMagma && i % 8 === 0) triggerFlash('#ffaa00');
        }, i * 40);
    }
}
/* js/fx.js */

// 1. SETUP FX LAYER
const fxLayer = document.createElement("div");
fxLayer.id = "fxLayer";
Object.assign(fxLayer.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "9999", overflow: "hidden"
});
document.body.appendChild(fxLayer);

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

// PARTICLE POOL
const MAX_PARTICLES = 80;
const particlePool = [];

function getParticle() {
    if (particlePool.length > 0) return particlePool.pop();
    const p = document.createElement("div");
    Object.assign(p.style, {
        position: "absolute",
        width: "8px", height: "8px",
        borderRadius: "50%",
        pointerEvents: "none",
        willChange: "transform, opacity" 
    });
    return p;
}

function releaseParticle(p) {
    p.remove();
    if (particlePool.length < MAX_PARTICLES) {
        particlePool.push(p);
    }
}

export function spawnParticles(x, y, color) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const count = isMobile ? 8 : 16; 
    const size = isMobile ? "10px" : "6px"; 

    for (let i = 0; i < count; i++) {
        const p = getParticle();
        fxLayer.appendChild(p);
        
        p.style.width = size;
        p.style.height = size;
        p.style.backgroundColor = color;
        p.style.boxShadow = `0 0 12px ${color}`;
        p.style.left = x + "px";
        p.style.top = y + "px";
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 40 + Math.random() * 60; 
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        const anim = p.animate([
            { transform: 'translate3d(0, 0, 0) scale(1.2)', opacity: 1 },
            { transform: `translate3d(${tx}px, ${ty}px, 0) scale(0)`, opacity: 0 }
        ], {
            duration: 500,
            easing: 'ease-out'
        });

        anim.onfinish = () => releaseParticle(p);
    }
}

export function triggerShake() {
    const board = document.querySelector('.board');
    if (!board) return;

    if (navigator.vibrate) {
        navigator.vibrate(20); 
    }

    board.classList.remove('shake-active');
    void board.offsetWidth; 
    board.classList.add('shake-active');
    
    setTimeout(() => board.classList.remove('shake-active'), 200);
}

export function triggerFlash(color = "white") {
    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.opacity = "0.4";
    setTimeout(() => flashOverlay.style.opacity = "0", 100);
}

export function setBackgroundPulse(color) {
    document.documentElement.style.setProperty('--glow', color);
}

// Added to fix the "import error" and ensure the victory screen works
export function startCelebration() {
    console.log("Matrix System Overload Initiated...");
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            spawnParticles(x, y, '#00ff41'); // Matrix Green Sparks
        }, i * 50);
    }
}
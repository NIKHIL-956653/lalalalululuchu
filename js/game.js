// js/game.js
import { playSound, toggleMute } from "./sound.js";
import { capacity, neighbors, drawCell } from "./board.js";
import { buildPlayerSettings } from "./player.js";
import { makeAIMove } from "./ai.js";         
import { spawnParticles, triggerShake, triggerFlash, setBackgroundPulse, startCelebration } from "./fx.js"; 
import { recordGameEnd, tryUnlockAchievement, loadData, saveTheme, getSavedTheme } from "./storage.js";
import { initMatrix, drawMatrix, stopMatrix, triggerMatrixFlash, matrixSettings } from "./matrix.js";

// Placeholders for Saga/Bliss to prevent 404 crashes
const SAGA_LEVELS = [];
const BLISS_LEVELS = [];
const makeSagaAIMove = makeAIMove;
const makeGreedyAIMove = makeAIMove;

const $ = s => document.querySelector(s);
const boardEl = $("#board");
const statusText = $("#statusText");
const turnBadge = $("#turnBadge");
const gridSelect = $("#gridSelect");
const undoBtn = $("#undoBtn");
const soundBtn = $("#soundBtn"); 
const playerCountSelect = $("#playerCountSelect");
const modeSelect = document.getElementById("gameModeSelect");
const standardControls = document.getElementById("standardControls");
const timerContainer = document.getElementById("timerContainer");
const timeLeftSpan = document.getElementById("timeLeft");
const playerSettingsContainer = document.getElementById("playerSettingsContainer");
const hudMessage = document.getElementById("hudMessage");
const territoryMeter = document.getElementById("territoryMeter");
const gameModal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalReplayBtn = document.getElementById("modalReplayBtn");
const modalNextBtn = document.getElementById("modalNextBtn");
const modalMenuBtn = document.getElementById("modalMenuBtn");

let aiMoveDelay = 1000, rows = 9, cols = 9, players = [], playerTypes = [];
let current = 0, board = [], playing = true, firstMove = [], history = [];
let scores = [], movesMade = 0, mode = "normal", timer = null, timeLimit = 120, timeLeft = timeLimit;
let aiTimeout = null, gameStartTime = 0, lowestCellCount = Infinity, maxChainReaction = 0, hintsRemaining = 0, isWatchingAd = false, lastMoveCell = null;

function init() {
    initMatrix(); 

    $("#startGameBtn")?.addEventListener('click', startGame);
    $("#backBtn")?.addEventListener('click', backToMenu);
    undoBtn?.addEventListener("click", undoMove);
    
    if(soundBtn) {
        soundBtn.addEventListener("click", () => {
            soundBtn.textContent = toggleMute() ? "🔇" : "🔊";
        });
    }

    // --- SYSTEM SIDEBAR CONTROLS ---
    $("#sidebarToggle")?.addEventListener('click', () => {
        document.getElementById("systemSidebar").classList.add('active');
    });

    // UPDATED: Robust listener for the new Exit button
    $("#closeSidebar")?.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents the click from bubbling to the board
        document.getElementById("systemSidebar").classList.remove('active');
    });

    boardEl.addEventListener('click', () => {
        document.getElementById("systemSidebar").classList.remove('active');
    });

    $("#toggleRain")?.addEventListener('click', (e) => {
        matrixSettings.rainOn = !matrixSettings.rainOn;
        e.target.classList.toggle('active', matrixSettings.rainOn);
        e.target.textContent = `RAIN: ${matrixSettings.rainOn ? 'ON' : 'OFF'}`;
    });

    $("#toggleSymbols")?.addEventListener('click', (e) => {
        matrixSettings.japaneseOn = !matrixSettings.japaneseOn;
        e.target.classList.toggle('active', matrixSettings.japaneseOn);
        e.target.textContent = `MODE: ${matrixSettings.japaneseOn ? 'KANJI' : 'BINARY'}`;
    });

    $("#toggleFlash")?.addEventListener('click', (e) => {
        matrixSettings.flashOn = !matrixSettings.flashOn;
        e.target.classList.toggle('active', matrixSettings.flashOn);
        e.target.textContent = `FLASH: ${matrixSettings.flashOn ? 'ON' : 'OFF'}`;
    });

    // --- END SIDEBAR CONTROLS ---

    $("#hintBtn")?.addEventListener('click', useHint);
    $("#watchAdBtn")?.addEventListener('click', playFakeAd);
    $("#closeAdBtn")?.addEventListener('click', () => { document.getElementById('adModal').style.display = 'none'; });
    $("#statsBtn")?.addEventListener('click', showStats);
    $("#closeStatsBtn")?.addEventListener('click', () => { document.getElementById('statsModal').style.display = 'none'; });

    const themeSelect = $("#themeSelect");
    const savedTheme = getSavedTheme();
    if (savedTheme) { applyTheme(savedTheme); if (themeSelect) themeSelect.value = savedTheme; }
    themeSelect?.addEventListener('change', (e) => { applyTheme(e.target.value); saveTheme(e.target.value); });

    playerCountSelect?.addEventListener("change", () => setupPlayers(parseInt(playerCountSelect.value, 10)));
    modeSelect?.addEventListener("change", handleModeChange);
    
    modalReplayBtn?.addEventListener("click", () => { closeModal(); resetGame(); });
    modalMenuBtn?.addEventListener("click", () => { closeModal(); backToMenu(); });

    handleModeChange();
    window.addEventListener('resize', () => { if (document.getElementById('gameView').classList.contains('active')) resizeBoard(); });
}

function applyTheme(t) {
    document.body.classList.remove('theme-cyberpunk', 'theme-magma', 'theme-matrix');
    stopMatrix(); 
    if (t === 'theme-matrix') {
        document.body.classList.add('theme-matrix');
        matrixSettings.rainOn = true;
        drawMatrix(); 
    } else if (t !== 'default') {
        document.body.classList.add(t);
    }
}

function startGame() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameView')?.classList.add('active');
    resetGame();
    setTimeout(resizeBoard, 50); 
}

function backToMenu() {
    playing = false; 
    clearTimeout(aiTimeout);
    stopTimer();
    closeModal();
    document.getElementById('gameView').classList.remove('active');
    const menu = document.getElementById('mainMenu');
    menu.classList.add('active');
    menu.style.display = 'flex'; 
    boardEl.innerHTML = ""; 
}

function resizeBoard() {
    const container = document.querySelector('.board-container');
    if (!container) return;
    const cellSize = Math.floor(Math.min((container.clientWidth - 20) / cols, (container.clientHeight - 20) / rows)) - 2; 
    boardEl.style.setProperty('--cell-size', `${cellSize}px`);
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    boardEl.style.gridAutoRows = `${cellSize}px`;
}

function setupPlayers(count) {
    buildPlayerSettings(count, players, playerTypes, () => {}, (triggerAI) => { 
        if(document.getElementById('gameView').classList.contains('active')) {
            updateStatus(); updateScores(); if (triggerAI) processTurn(); else paintAll();
        }
    }, current);
}

function handleModeChange() {
    mode = modeSelect.value;
    timerContainer.style.display = (mode === "timeAttack") ? "inline-block" : "none"; 
    setupPlayers(parseInt(playerCountSelect.value, 10));
}

function resetGame() {
  closeModal(); gameStartTime = Date.now(); lowestCellCount = Infinity; maxChainReaction = 0; updateHintUI();
  const [c, r] = gridSelect.value.split("x").map(Number);
  cols = c; rows = r; current = 0; playing = true;
  firstMove = players.map(() => false); history = []; movesMade = 0;
  board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ owner: -1, count: 0, isBlocked: false })));
  
  boardEl.innerHTML = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.addEventListener("click", () => handleMove(x, y));
      boardEl.appendChild(cell);
    }
  }
  updateStatus(); updateScores(); paintAll(); processTurn(); resizeBoard();
  if (mode === "timeAttack") startTimer();
}

function startTimer() { stopTimer(); timeLeft = timeLimit; timer = setInterval(() => { timeLeft--; timeLeftSpan.textContent = timeLeft; if (timeLeft <= 0) endGameDueToTime(); }, 1000); }
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
function endGameDueToTime() { playing = false; showGameOver("Time's Up!", "Objective failed.", false); }

function handleMove(x, y) {
  if (!playing || playerTypes[current].type === "ai") return;
  if (board[y][x].owner !== -1 && board[y][x].owner !== current) return;
  document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
  makeMove(x, y);
}

async function makeMove(x, y) {
  playSound("click");
  history.push(JSON.stringify({ board: board.map(r => r.map(c => ({...c}))), current, playing, firstMove: [...firstMove], scores: [...scores], movesMade }));
  board[y][x].owner = current; board[y][x].count += 1; movesMade++;
  
  drawCell(x, y, board, boardEl, cols, players, current);
  await resolveReactions();
  firstMove[current] = true; updateScores();
  if (playing && !checkWin()) advanceTurn();
}

async function resolveReactions() {
  const q = [];
  const findExplosions = () => { q.length = 0; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (board[y][x].count >= capacity(x, y, rows, cols)) q.push([x, y]); };
  findExplosions(); if (!q.length) return;

  const sleep = ms => new Promise(r => requestAnimationFrame(() => setTimeout(r, ms)));
  let loops = 0;
  while (q.length && loops++ < 600) {
    updateScores(); 
    if (movesMade >= players.length) {
        const alive = players.map((_, i) => scores[i] > 0).filter(Boolean);
        if (alive.length === 1) break; 
    }

    if (document.body.classList.contains('theme-matrix')) triggerMatrixFlash();
    const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))].map(s => s.split(",").map(Number)); 
    q.length = 0;

    for (const [x, y] of wave) {
      const cap = capacity(x, y, rows, cols); const cell = board[y][x];
      if (cell.count < cap) continue;

      spawnParticles(x, y, players[current].color); 

      cell.count -= cap; if (cell.count === 0) cell.owner = -1; playSound("explode");
      drawCell(x, y, board, boardEl, cols, players, current);

      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) { 
        board[ny][nx].owner = current; board[ny][nx].count += 1; 
        drawCell(nx, ny, board, boardEl, cols, players, current);
      }
    }
    findExplosions(); await sleep(80);
  }
}

function processTurn() {
  if (!playing || playerTypes[current].type !== "ai") return;
  clearTimeout(aiTimeout);
  aiTimeout = setTimeout(() => {
    let move = makeAIMove(board, current, playerTypes[current].difficulty, rows, cols, players.length);
    if (move) {
        document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
        lastMoveCell = boardEl.children[move.y * cols + move.x];
        lastMoveCell?.classList.add('last-move');
        makeMove(move.x, move.y);
    } else advanceTurn();
  }, aiMoveDelay);
}

function paintAll(turn = false) { for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) drawCell(x, y, board, boardEl, cols, players, current, turn); }
function updateScores() { scores = players.map(() => 0); let total = 0; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (board[y][x].owner !== -1) { scores[board[y][x].owner] += board[y][x].count; total += board[y][x].count; } if (territoryMeter && total > 0) { territoryMeter.innerHTML = ''; players.forEach((p, i) => { if (scores[i] > 0) { const b = document.createElement('div'); b.className = 'meter-bar'; b.style.width = (scores[i]/total)*100 + '%'; b.style.backgroundColor = p.color; territoryMeter.appendChild(b); } }); } }
function updateStatus() { if (players[current]) { statusText.textContent = `${players[current].name}'s turn`; turnBadge.style.background = players[current].color; } }
function undoMove() { if (!history.length) return; clearTimeout(aiTimeout); const prev = JSON.parse(history.pop()); board = prev.board; current = prev.current; playing = prev.playing; firstMove = prev.firstMove; scores = prev.scores; movesMade = prev.movesMade; closeModal(); paintAll(true); updateStatus(); updateScores(); }
function checkWin() { const alive = players.map((_,i) => scores[i] > 0).filter(Boolean); if (movesMade >= players.length && alive.length === 1) { playing = false; recordGameEnd(0, 'hard'); showGameOver("Victory!", "System Secured!", true); return true; } return false; }
function showStats() { const data = loadData(); document.getElementById('statsBody').innerHTML = `Matches: ${data.stats.matches}<br>Losses: ${data.stats.losses}`; document.getElementById('statsModal').style.display = 'flex'; }
function useHint() { if (!playing || playerTypes[current].type === 'ai') return; if (hintsRemaining <= 0) { document.getElementById('adModal').style.display = 'flex'; return; } const best = makeAIMove(board, current, "hard", rows, cols, players.length); if (best) { hintsRemaining--; updateHintUI(); const el = boardEl.children[best.y * cols + best.x]; el.classList.add('hint-active'); setTimeout(() => el.classList.remove('hint-active'), 3000); } }
function playFakeAd() { if (isWatchingAd) return; isWatchingAd = true; document.getElementById('adProgressContainer').style.display = 'block'; let w = 0; const int = setInterval(() => { w += 2; document.getElementById('adBar').style.width = w + '%'; if (w >= 100) { clearInterval(int); finishAd(); } }, 50); }
function finishAd() { isWatchingAd = false; document.getElementById('adModal').style.display = 'none'; document.getElementById('adProgressContainer').style.display = 'none'; document.getElementById('adBar').style.width = '0%'; hintsRemaining += 5; updateHintUI(); playSound('win'); }
function updateHintUI() { const el = document.getElementById('hintCount'); if (el) el.textContent = hintsRemaining; }
function advanceTurn() { let loop = 0; do { current = (current + 1) % players.length; loop++; } while (firstMove[current] && scores[current] === 0 && loop < players.length); updateStatus(); paintAll(true); if (playing) processTurn(); }

function showGameOver(t, m, w) {
    if (document.body.classList.contains('theme-matrix')) {
        for(let i=0; i<5; i++) setTimeout(triggerMatrixFlash, i * 150); 
    }
    if (w) {
        playSound('win'); 
        if (typeof startCelebration === 'function') startCelebration(); 
    }
    modalTitle.textContent = t;
    modalTitle.style.color = w ? "var(--primary)" : "#ff4757";
    modalBody.innerHTML = m;
    modalNextBtn.style.display = "none";
    gameModal.style.display = "flex";
}

function closeModal() { gameModal.style.display = "none"; }

init();
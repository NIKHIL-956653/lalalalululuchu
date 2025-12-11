import { playSound, toggleMute } from "./sound.js";
import { capacity, neighbors, drawCell } from "./board.js";
import { buildPlayerSettings } from "./player.js";
import { SAGA_LEVELS, BLISS_LEVELS } from "./levels.js"; 
import { makeAIMove } from "./ai.js";        
import { makeSagaAIMove } from "./ai2.js"; 
import { makeGreedyAIMove } from "./greedy.js"; 
import { spawnParticles, triggerShake, triggerFlash, setBackgroundPulse, triggerChainFever } from "./fx.js"; 
import { recordGameEnd, tryUnlockAchievement, loadData, saveTheme, getSavedTheme } from "./storage.js";

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
const aiSpeedSelect = document.getElementById("aiSpeedSelect");
const levelSelectorContainer = document.getElementById("levelSelectorContainer");
const levelSelect = document.getElementById("levelSelect");
const levelNameDisplay = document.getElementById("levelNameDisplay");
const timerContainer = document.getElementById("timerContainer");
const timerDisplay = document.getElementById("timerDisplay");
const timeLeftSpan = document.getElementById("timeLeft");
const timerSelect = document.getElementById("timerSelect");
const playerSettingsContainer = document.getElementById("playerSettingsContainer");

// NEW HUD ELEMENTS
const hudMessage = document.getElementById("hudMessage");
const territoryMeter = document.getElementById("territoryMeter");

// MODAL ELEMENTS
const gameModal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalReplayBtn = document.getElementById("modalReplayBtn");
const modalNextBtn = document.getElementById("modalNextBtn");
const modalMenuBtn = document.getElementById("modalMenuBtn");

let aiMoveDelay = 1000; 
let rows = 9, cols = 9;
let players = [];
let playerTypes = [];
let current = 0, board = [], playing = true, firstMove = [], history = [];
let scores = [], movesMade = 0;
let mode = "normal", timer = null, timeLimit = 120, timeLeft = timeLimit;
let aiTimeout = null;

// SAGA/BLISS STATE
let currentLevelIndex = 0;
let levelMaxMoves = null;      
let playerMovesRemaining = 0; 
let eliminationOrder = [];

// TRACKING VARIABLES
let gameStartTime = 0;
let lowestCellCount = Infinity; 
let maxChainReaction = 0;        

// --- NEW HINT VARIABLES ---
let hintsRemaining = 0;
let isWatchingAd = false;

function init() {
  const startBtn = document.getElementById('startGameBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);

  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', backToMenu);

  undoBtn.addEventListener("click", undoMove);
  
  if(soundBtn) {
      soundBtn.addEventListener("click", () => {
          const muted = toggleMute();
          soundBtn.textContent = muted ? "🔇" : "🔊";
      });
  }

  // --- HINT & AD LISTENERS ---
  const hintBtn = document.getElementById('hintBtn');
  const watchAdBtn = document.getElementById('watchAdBtn');
  const closeAdBtn = document.getElementById('closeAdBtn');

  if(hintBtn) hintBtn.addEventListener('click', useHint);
  if(watchAdBtn) watchAdBtn.addEventListener('click', playFakeAd);
  if(closeAdBtn) closeAdBtn.addEventListener('click', () => {
      document.getElementById('adModal').style.display = 'none';
  });
  // ---------------------------

  const statsBtn = document.getElementById('statsBtn');
  if (statsBtn) statsBtn.addEventListener('click', showStats);
  
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  if (closeStatsBtn) closeStatsBtn.addEventListener('click', () => {
      document.getElementById('statsModal').style.display = 'none';
  });

  const themeSelect = document.getElementById('themeSelect');
  const savedTheme = getSavedTheme();
  if (savedTheme) {
      applyTheme(savedTheme);
      if (themeSelect) themeSelect.value = savedTheme;
  }
  if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
          const newTheme = e.target.value;
          applyTheme(newTheme);
          saveTheme(newTheme);
      });
  }

  playerCountSelect.addEventListener("change", () => {
      if (mode === 'normal' || mode === 'timeAttack') {
          setupPlayers(parseInt(playerCountSelect.value, 10));
      }
  });

  aiSpeedSelect.addEventListener("change", () => {
      aiMoveDelay = parseInt(aiSpeedSelect.value, 10);
  });

  modeSelect.addEventListener("change", handleModeChange);
  timerSelect.addEventListener("change", handleTimerChange);
  levelSelect.addEventListener("change", (e) => {
      currentLevelIndex = parseInt(e.target.value, 10);
  });

  modalReplayBtn.addEventListener("click", () => {
      closeModal();
      resetGame();
  });

  if (modalMenuBtn) {
      modalMenuBtn.addEventListener("click", () => {
          closeModal();
          backToMenu();
      });
  }
  
  modalNextBtn.addEventListener("click", () => {
      closeModal();
      const list = getActiveLevelList();
      if (currentLevelIndex < list.length - 1) {
          currentLevelIndex++;
          levelSelect.value = currentLevelIndex;
          resetGame();
      } else {
          alert("All levels completed!");
          currentLevelIndex = 0;
          levelSelect.value = 0;
          backToMenu();
      }
  });

  if(aiSpeedSelect) aiMoveDelay = parseInt(aiSpeedSelect.value, 10);

  handleModeChange();
  
  window.addEventListener('resize', () => {
      if (document.getElementById('gameView').classList.contains('active')) {
          resizeBoard();
      }
  });
}

function applyTheme(themeName) {
    document.body.classList.remove('theme-cyberpunk', 'theme-magma', 'theme-matrix');
    if (themeName !== 'default') {
        document.body.classList.add(themeName);
    }
}

// --- FIXED STARTGAME (Menu Fix Included) ---
function startGame() {
    // 1. Force hide the menu
    const menu = document.getElementById('mainMenu');
    if (menu) {
        menu.classList.remove('active');
        menu.style.display = 'none'; // Critical for fixing stuck menu
    }

    // 2. Show Game
    const gameView = document.getElementById('gameView');
    if (gameView) {
        gameView.classList.add('active');
    }

    resetGame();
    setTimeout(resizeBoard, 50); 
}

// --- FIXED BACKTOMENU (Menu Fix Included) ---
function backToMenu() {
    playing = false; 
    clearTimeout(aiTimeout);
    closeModal();
    
    // 1. Hide Game
    const gameView = document.getElementById('gameView');
    if (gameView) {
        gameView.classList.remove('active');
    }

    // 2. Force Show Menu
    const menu = document.getElementById('mainMenu');
    if (menu) {
        menu.classList.add('active');
        menu.style.display = 'flex'; // Critical for fixing stuck menu
    }
}

function resizeBoard() {
    const container = document.querySelector('.board-container');
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const sizeByWidth = (w - 20) / cols;
    const sizeByHeight = (h - 20) / rows;
    const cellSize = Math.floor(Math.min(sizeByWidth, sizeByHeight)) - 2; 
    
    if (boardEl) {
        boardEl.style.setProperty('--cell-size', `${cellSize}px`);
        boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        boardEl.style.gridAutoRows = `${cellSize}px`;
    }
}

function closeModal() {
    gameModal.style.display = "none";
}

function showGameOver(title, message, isWin) {
    modalTitle.textContent = title;
    modalTitle.style.color = isWin ? "var(--primary)" : "#ff4757"; 
    modalBody.innerHTML = message; 
    
    const list = getActiveLevelList();
    const isCampaign = (mode === 'saga' || mode === 'bliss');
    const hasNext = isCampaign && (currentLevelIndex < list.length - 1);

    if (isWin && hasNext) {
        modalNextBtn.style.display = "inline-block";
        modalReplayBtn.textContent = "Replay Level";
    } else {
        modalNextBtn.style.display = "none";
        modalReplayBtn.textContent = "Play Again";
    }

    gameModal.style.display = "flex";
}

function getActiveLevelList() {
    if (mode === 'saga') return SAGA_LEVELS;
    if (mode === 'bliss') return BLISS_LEVELS;
    return [];
}

function populateLevelSelect() {
    const list = getActiveLevelList();
    levelSelect.innerHTML = "";
    list.forEach((level, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${level.id}: ${level.name}`;
        levelSelect.appendChild(option);
    });
    currentLevelIndex = 0;
}

function setupPlayers(count) {
    const isCustomMode = (mode === 'saga' || mode === 'bliss');
    const actualCount = isCustomMode ? 2 : count;

    buildPlayerSettings(
        actualCount,
        players, 
        playerTypes, 
        () => {}, 
        (triggerAI) => { 
            if(document.getElementById('gameView').classList.contains('active')) {
                updateStatus(); 
                updateScores(); // Calls meter update
                if (triggerAI) processTurn();
                else paintAll();
            }
        },
        current
    );
}

function handleModeChange() {
    mode = modeSelect.value;
    const isTimeAttack = mode === "timeAttack";
    const isCustomMode = (mode === 'saga' || mode === 'bliss');

    timerContainer.style.display = "none"; 
    
    if (isTimeAttack) {
        timerContainer.style.display = "inline-block";
        timerSelect.style.display = "inline-block";
    }

    if (isCustomMode) {
        standardControls.style.display = 'none';
        playerSettingsContainer.style.display = 'none'; 
        levelSelectorContainer.style.display = 'block';
        populateLevelSelect(); 
        setupPlayers(2);
    } else {
        standardControls.style.display = 'inline';
        playerSettingsContainer.style.display = 'flex';
        levelSelectorContainer.style.display = 'none';
        setupPlayers(parseInt(playerCountSelect.value, 10));
    }
}

function handleTimerChange() {}

function resetGame() {
  closeModal(); 
  gameStartTime = Date.now();
  lowestCellCount = Infinity;
  maxChainReaction = 0;

  // Ensure Hint UI is up to date on reset
  updateHintUI();

  let initialCols, initialRows;
  let blockedCoords = [];
  let startSetup = [];
  let aiSetting = null;

  levelMaxMoves = null;
  playerMovesRemaining = 0;
  eliminationOrder = [];

  if (mode === 'saga' || mode === 'bliss') {
      const list = getActiveLevelList();
      if (!list[currentLevelIndex]) currentLevelIndex = 0;
      const level = list[currentLevelIndex];
      initialCols = level.cols;
      initialRows = level.rows;
      blockedCoords = level.blocked || [];
      startSetup = level.setup || [];
      aiSetting = level.aiDifficulty;
      levelMaxMoves = level.maxMoves || null;
      levelNameDisplay.textContent = level.name;
      
      if (levelMaxMoves !== null) {
          playerMovesRemaining = levelMaxMoves;
          timerContainer.style.display = "inline-block";
          timerSelect.style.display = "none";
          timeLeftSpan.textContent = playerMovesRemaining;
      } else {
          timerContainer.style.display = "none";
      }
  } else {
      const [c, r] = gridSelect.value.split("x").map(Number);
      initialCols = c;
      initialRows = r;
      if (mode === 'timeAttack') {
          timerContainer.style.display = "inline-block";
          timerSelect.style.display = "none"; 
      }
  }

  cols = initialCols;
  rows = initialRows;
  current = 0; playing = true;
  firstMove = players.map(() => false);
  history = [];
  movesMade = 0;
  
  board = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({ 
        owner: -1, count: 0, isBlocked: false 
    }))
  );
  
  for (const [x, y] of blockedCoords) {
      if (y < rows && x < cols) board[y][x].isBlocked = true;
  }

  for (const setup of startSetup) {
      if (board[setup.y] && board[setup.y][setup.x] && !board[setup.y][setup.x].isBlocked) {
          board[setup.y][setup.x].owner = setup.owner;
          board[setup.y][setup.x].count = setup.count;
      }
  }
  
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = ""; 
  boardEl.style.gridAutoRows = "";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.setAttribute("data-x", x);
      cell.setAttribute("data-y", y);
      cell.setAttribute("aria-label", `Cell ${x + 1},${y + 1}`);
      cell.addEventListener("click", () => handleMove(x, y));
      boardEl.appendChild(cell);
    }
  }

  if (mode === 'saga' || mode === 'bliss') {
      if (players.length < 2) setupPlayers(2);
      playerTypes[0] = { type: 'human', difficulty: null };
      playerTypes[1] = { type: 'ai', difficulty: aiSetting || 'easy' };
      players[0].name = "You";
      players[1].name = (mode === 'bliss') ? "Puzzle AI" : "Enemy General";
  }

  updateStatus((mode === 'saga' || mode === 'bliss') ? "Your Turn" : `Player ${current + 1}'s turn`);
  updateScores();
  
  if (mode === "timeAttack") { timeLimit = parseInt(timerSelect.value, 10); startTimer(); }
  else { stopTimer(); }
  
  paintAll();
  processTurn();
  resizeBoard();
}

function startTimer() {
  stopTimer();
  timeLeft = timeLimit;
  timeLeftSpan.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--; timeLeftSpan.textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(timer); endGameDueToTime(); }
  }, 1000);
}

function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

function endGameDueToTime() { 
    playing = false; 
    showGameOver("Time's Up!", "You ran out of time!", false);
}

function advanceTurn() {
  let loopCount = 0;
  do {
      current = (current + 1) % players.length;
      loopCount++;
      if (loopCount > players.length) break; 
  } while (firstMove[current] && scores[current] === 0);

  updateStatus(); 
  paintAll(true);
  
  if ((mode === 'saga' || mode === 'bliss') && levelMaxMoves !== null && current === 0) {
      if (playerMovesRemaining <= 0) {
          playing = false;
          showGameOver("Out of Moves!", "You failed to complete the objective in time.", false);
          return; 
      }
  }

  if (playing) processTurn();
}

function processTurn() {
  if (!playing) return;
  const p = playerTypes[current];
  if (!p || p.type !== "ai") return;
  
  clearTimeout(aiTimeout);
  
  aiTimeout = setTimeout(() => {
    let move;
    if (p.difficulty === 'greedy') {
        move = makeGreedyAIMove(board, current, rows, cols); 
    } else if (mode === 'saga' || mode === 'bliss') {
        move = makeSagaAIMove(board, current, p.difficulty, rows, cols, players.length);
    } else {
        move = makeAIMove(board, current, p.difficulty, rows, cols, players.length);
    }
    if (move) makeMove(move.x, move.y);
    else advanceTurn();
  }, aiMoveDelay);
}

function handleMove(x, y) {
  if (!playing) return;
  if (playerTypes[current].type === "ai") return;
  const cell = board[y][x];
  if (cell.isBlocked) return;
  if (cell.owner !== -1 && cell.owner !== current) return;
  makeMove(x, y);
}

async function makeMove(x, y) {
  playSound("click");

  history.push(JSON.stringify({ 
      board: board.map(row => row.map(c => ({...c}))),
      current, playing, firstMove: [...firstMove], scores: [...scores], movesMade,
      playerMovesRemaining, eliminationOrder: [...eliminationOrder]
  }));
  
  const cell = board[y][x];
  cell.owner = current; cell.count += 1;
  movesMade++;

  if ((mode === 'saga' || mode === 'bliss') && levelMaxMoves !== null && current === 0) {
      playerMovesRemaining--;
      if(timeLeftSpan) timeLeftSpan.textContent = playerMovesRemaining; 
  }
  
  drawCell(x, y, board, boardEl, cols, players, current);
  await resolveReactions();
  
  firstMove[current] = true;
  updateScores();
  
  const won = checkWin();
  if (playing && !won) advanceTurn();
}

async function resolveReactions() {
  const q = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
        if (board[y][x].isBlocked) continue; 
        if (board[y][x].count >= capacity(x, y, rows, cols)) q.push([x, y]);
    }
  }

  if (!q.length) return;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let loopCount = 0;
  const MAX_LOOPS = 600; 

  while (q.length) {
    loopCount++;
    if (loopCount > MAX_LOOPS) break;

    const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))].map(s => s.split(",").map(Number));
    q.length = 0;
    const toInc = [];

    let reactionSize = wave.length;
    maxChainReaction += reactionSize;

    // --- REPLACED: NEW HUD NOTIFICATION FOR CHAIN FEVER ---
    if (reactionSize >= 8 || (loopCount === 5 && maxChainReaction > 15)) {
        // Show text in the bar instead of overlay
        showGameNotification("CHAIN FEVER! ⚡", "#ff0"); 
        triggerChainFever(); // Keeps screen shake/pulse but we handle text separately
        await sleep(400); 
    }

    if (maxChainReaction >= 50) {
        if (tryUnlockAchievement('nuclear', 'Nuclear Launch', '50+ atoms!')) {
            showGameNotification("NUCLEAR LAUNCH! ☢️", "#f00");
        }
    }

    if (loopCount > 3) triggerShake(); 
    if (loopCount > 8) triggerFlash(players[current].color); 

    for (const [x, y] of wave) {
      const cap = capacity(x, y, rows, cols);
      const cell = board[y][x];
      if (cell.count < cap) continue;
      
      cell.count -= cap;
      if (cell.count === 0) cell.owner = -1;

      if (loopCount < 15) playSound("explode");

      const cellIndex = y * cols + x;
      const cellElement = boardEl.children[cellIndex];
      if (cellElement) {
          const rect = cellElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          spawnParticles(centerX, centerY, players[current].color);
      }

      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) { 
        const nc = board[ny][nx];
        nc.owner = current;
        nc.count += 1;
        if (nc.count >= capacity(nx, ny, rows, cols)) toInc.push([nx, ny]);
      }
    }

    paintAll();
    for (const p of toInc) q.push(p);

    if (movesMade > players.length * 2) {
        const activeOwners = new Set();
        let hasOrbs = false;
        for(let r = 0; r < rows; r++) {
            for(let c = 0; c < cols; c++) {
                if (!board[r][c].isBlocked && board[r][c].owner !== -1) {
                    activeOwners.add(board[r][c].owner);
                    hasOrbs = true;
                }
            }
        }
        if (hasOrbs && activeOwners.size === 1) {
            q.length = 0; 
            break;        
        }
    }

    let delay = 120;
    if (loopCount > 5) delay = 60;
    if (loopCount > 15) delay = 10; 
    if (loopCount > 40) delay = 5;

    await sleep(delay);
  }
}

function paintAll(isTurnChange = false) {
    if (isTurnChange && players[current]) {
        const color = players[current].color;
        document.documentElement.style.setProperty("--glow", color);
        setBackgroundPulse(color);
    }
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            drawCell(x, y, board, boardEl, cols, players, current, isTurnChange);
        }
    }
}

// --- NEW FUNCTION: Update Territory Meter ---
function updateScores() {
  scores = players.map(() => 0);
  let totalOrbs = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (board[y][x].isBlocked) continue; 
      const o = board[y][x].owner;
      if (o !== -1) {
          scores[o] += board[y][x].count;
          totalOrbs += board[y][x].count;
      }
    }
  }

  const myCells = scores[0]; 
  if (myCells > 0 && myCells < lowestCellCount) {
      lowestCellCount = myCells;
  }

  // Update Meter UI
  if (territoryMeter) {
      territoryMeter.innerHTML = '';
      if (totalOrbs > 0) {
          players.forEach((p, i) => {
              if (scores[i] > 0) {
                  const pct = (scores[i] / totalOrbs) * 100;
                  const bar = document.createElement('div');
                  bar.className = 'meter-bar';
                  bar.style.width = pct + '%';
                  bar.style.backgroundColor = p.color;
                  territoryMeter.appendChild(bar);
              }
          });
      }
  }
}

function renderScores() {
    // This function is now mostly redundant visually but useful for debugging
    // We keep it empty or minimal since the meter replaces it
}

// --- NEW FUNCTION: Show Messages in HUD ---
function showGameNotification(text, color) {
    if (!hudMessage) return;
    hudMessage.textContent = text;
    hudMessage.style.color = color || "#fff";
    hudMessage.classList.add('active');
    
    setTimeout(() => {
        hudMessage.classList.remove('active');
    }, 2000);
}

function updateStatus(extra) {
  const p = players[current];
  if (!p) return;
  statusText.textContent = extra || `${p.name}'s turn`;
  turnBadge.style.background = p.color;
}

function undoMove() {
  if (!history.length) return;
  clearTimeout(aiTimeout);
  const prev = JSON.parse(history.pop());
  board = prev.board; current = prev.current; playing = prev.playing;
  firstMove = prev.firstMove; scores = prev.scores || scores; movesMade = prev.movesMade || movesMade;
  
  playerMovesRemaining = prev.playerMovesRemaining !== undefined ? prev.playerMovesRemaining : playerMovesRemaining;
  eliminationOrder = prev.eliminationOrder || []; 

  if(levelMaxMoves !== null) {
      if(timeLeftSpan) timeLeftSpan.textContent = playerMovesRemaining;
  }
  
  closeModal(); 
  paintAll(true); updateStatus(); updateScores();
}

function launchConfetti(color) {
    const confettiCount = 60;
    for (let i = 0; i < confettiCount; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti";
      piece.style.setProperty("--color", color);
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.animationDelay = (Math.random() * 2) + "s";
      piece.style.opacity = Math.random().toString();
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }
}

function checkWin() {
  if (mode === 'saga' || mode === 'bliss') {
      const counts = players.map(() => 0);
      for (let y=0;y<rows;y++) for (let x=0;x<cols;x++){
        if (board[y][x].isBlocked) continue;
        const o = board[y][x].owner; if (o !== -1) counts[o] += board[y][x].count;
      }
      const alive = counts.map((c,i)=>({count:c,idx:i})).filter(p=>p.count>0);
      if (alive.length === 1) {
          if (alive[0].idx === 0) {
            playing = false;
            if (playerTypes[1] && playerTypes[1].type === 'ai') {
                recordGameEnd(0, playerTypes[1].difficulty);
            }
            showGameOver("Level Complete!", "Excellent strategy! You defeated the AI.", true);
            playSound("win");
            launchConfetti(players[0].color);
            return true;
          } else {
             playing = false;
             recordGameEnd(1, null);
             showGameOver("Level Failed", "The AI has conquered the board.", false);
             return true;
          }
      }
      return false;
  }

  const minRounds = 3;
  const minMovesForWin = players.length * minRounds;
  if (movesMade < minMovesForWin) return false;
  
  const counts = players.map(() => 0);
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++){
    if (board[y][x].isBlocked) continue;
    const o = board[y][x].owner; if (o !== -1) counts[o] += board[y][x].count;
  }
  
  for(let i=0; i<players.length; i++) {
      if (firstMove[i] && counts[i] === 0 && !eliminationOrder.includes(i)) {
          eliminationOrder.push(i);
      }
  }

  const alive = counts.map((c,i)=>({count:c,idx:i})).filter(p=>p.count>0);
  
  if (alive.length === 1) {
      playing = false;
      const w = alive[0].idx;
      const winnerName = players[w].name?.trim() || `Player ${w+1}`;

      if (w === 0) { 
          const aiDiff = (playerTypes[1] && playerTypes[1].type === 'ai') ? playerTypes[1].difficulty : null;
          recordGameEnd(0, aiDiff);
          
          const timeTaken = (Date.now() - gameStartTime) / 1000;
          if (timeTaken < 60) {
              tryUnlockAchievement('speed', 'Speed Demon', 'Win a game in under 60 seconds');
          }
          if (lowestCellCount <= 1) {
              tryUnlockAchievement('underdog', 'Underdog', 'Win after dropping to 1 orb');
          }
      } else {
          recordGameEnd(w, null);
      }
      
      let rankText = `🏆 <b>${winnerName} Wins!</b><br><br>`;
      if (players.length > 2) {
          if (eliminationOrder.length > 0) {
              const secondIdx = eliminationOrder[eliminationOrder.length - 1];
              const secondName = players[secondIdx].name || `P${secondIdx+1}`;
              rankText += `🥈 2nd: ${secondName}<br>`;
          }
          if (players.length >= 6 && eliminationOrder.length > 1) {
              const thirdIdx = eliminationOrder[eliminationOrder.length - 2];
              const thirdName = players[thirdIdx].name || `P${thirdIdx+1}`;
              rankText += `🥉 3rd: ${thirdName}`;
          }
      } else {
          rankText += "Great Match!";
      }
      
      showGameOver("Game Over", rankText, true);
      playSound("win");
      launchConfetti(players[w].color);
      return true;
  }
  return false;
}

function showStats() {
    const data = loadData();
    const body = document.getElementById('statsBody');
    const isUn = (id) => data.achievements.includes(id) ? 'unlocked' : '';
    
    body.innerHTML = `
        <div class="stat-row"><span class="stat-label">Total Games:</span> <span class="stat-val">${data.stats.matches}</span></div>
        <div class="stat-row"><span class="stat-label">Losses:</span> <span class="stat-val" style="color:#ff4757">${data.stats.losses}</span></div>
        <hr style="border-color:#333; margin:10px 0">
        <div class="stat-row"><span class="stat-label">Easy Wins:</span> <span class="stat-val">${data.stats.wins.easy || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Aggressive Wins:</span> <span class="stat-val">${data.stats.wins.greedy || 0}</span></div>
        <div class="stat-row"><span class="stat-label">Hard Wins:</span> <span class="stat-val" style="color:var(--primary)">${data.stats.wins.hard || 0}</span></div>
        <br>
        <h4>Achievements</h4>
        <div>
            <span class="ach-tag ${isUn('speed')}">⚡ Speed Demon</span>
            <span class="ach-tag ${isUn('nuclear')}">☢️ Nuclear</span>
            <span class="ach-tag ${isUn('underdog')}">🐕 Underdog</span>
        </div>
    `;
    document.getElementById('statsModal').style.display = 'flex';
}

// --- HINT SYSTEM LOGIC ---

function useHint() {
    if (!playing || playerTypes[current].type === 'ai') return;

    // If no hints left, offer the Ad
    if (hintsRemaining <= 0) {
        document.getElementById('adModal').style.display = 'flex';
        return;
    }

    // 1. Calculate the Best Move for the Human
    // We use "hard" difficulty to get the best possible advice
    // Note: We pass 'current' (human index) so the AI thinks like the human
    const bestMove = makeAIMove(board, current, "hard", rows, cols, players.length);

    if (bestMove) {
        // 2. Decrement Hint Count
        hintsRemaining--;
        updateHintUI();

        // 3. Highlight the Cell
        const cellIndex = bestMove.y * cols + bestMove.x;
        const cellEl = boardEl.children[cellIndex];
        
        if (cellEl) {
            // Remove existing hints first
            document.querySelectorAll('.hint-active').forEach(el => el.classList.remove('hint-active'));
            
            // Add pulse effect
            cellEl.classList.add('hint-active');
            
            // Show HUD message
            showGameNotification("Try this move! 💡", "#ffd700");

            // Remove hint after 3 seconds or on click
            setTimeout(() => cellEl.classList.remove('hint-active'), 3000);
        }
    }
}

function playFakeAd() {
    if (isWatchingAd) return;
    isWatchingAd = true;
    
    const adBar = document.getElementById('adBar');
    const container = document.getElementById('adProgressContainer');
    const btns = document.querySelector('#adModal .modal-actions');
    
    container.style.display = 'block';
    btns.style.display = 'none'; // Hide buttons so they can't close it
    
    let width = 0;
    const interval = setInterval(() => {
        width += 2; // Speed of ad
        adBar.style.width = width + '%';
        
        if (width >= 100) {
            clearInterval(interval);
            finishAd();
        }
    }, 50); // 50ms * 50 steps = 2.5 seconds ad
}

function finishAd() {
    isWatchingAd = false;
    document.getElementById('adModal').style.display = 'none';
    
    // Reset Ad UI for next time
    document.getElementById('adProgressContainer').style.display = 'none';
    document.getElementById('adBar').style.width = '0%';
    document.querySelector('#adModal .modal-actions').style.display = 'flex';

    // Reward Player
    hintsRemaining += 5;
    updateHintUI();
    playSound('win'); // Happy sound!
    showGameNotification("5 Hints Added! 💡", "#ffd700");
}

function updateHintUI() {
    const el = document.getElementById('hintCount');
    if (el) el.textContent = hintsRemaining;
}

init();
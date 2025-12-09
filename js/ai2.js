// js/ai2.js
// ADVANCED AI (SAGA/BLISS)

import { neighbors, capacity } from "./board.js"; 
import { simulateBoardState, minimax, jitter } from "./ai-core.js"; 

export function makeSagaAIMove(board, playerIndex, difficulty, rows, cols, playersLength) {
  const valid = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = board[y][x];
      if (!c.isBlocked && (c.owner === -1 || c.owner === playerIndex)) {
          valid.push({x, y});
      }
    }
  }
  if (!valid.length) return null;

  // NEW "EASY (SMART)" MODE (Formerly Medium)
  if (difficulty === "easy" || difficulty === "medium") {
    const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    const enemyPressure = (x, y) => {
      let s = 0; 
      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) {
        const n = board[ny][nx]; 
        if (n.owner !== -1 && n.owner !== playerIndex) s += Math.min(n.count, 2);
      } return s;
    };
    
    let cand = [];
    for (const {x, y} of valid) {
      const cell = board[y][x];
      const cap = capacity(x, y, rows, cols);
      const nearBoom = (cell.count + 1 >= cap) ? 1 : 0;
      const centerBonus = 1 / (1 + Math.hypot(x - cx, y - cy));
      const pressure = enemyPressure(x, y) / 4;
      const ownBonus = (cell.owner === playerIndex) ? 0.15 : 0;
      const score = nearBoom * 2.5 + centerBonus * 1.2 + pressure + ownBonus + jitter(0.25);
      cand.push({ x, y, score });
    }
    
    cand.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    const pickFrom = Math.min(5, cand.length);
    return cand[Math.floor(Math.random() * pickFrom)];
  } 
  
  // HARD (MASTER) MODE
  if (difficulty === "hard") {
    const searchDepth = 3; 
    let bestMove = null;
    let bestVal = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    let candidates = [...valid];
    candidates.sort(() => Math.random() - 0.5); 

    if (candidates.length > 40) return makeSagaAIMove(board, playerIndex, "easy", rows, cols, playersLength);

    for (const move of candidates) {
      const nextBoard = simulateBoardState(board, move.x, move.y, playerIndex, rows, cols);
      if (nextBoard) {
        const val = minimax(nextBoard, searchDepth - 1, false, playerIndex, playersLength, rows, cols, alpha, beta); 
        
        if (val > bestVal) {
          bestVal = val;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestVal);
      }
    }
    return bestMove || makeSagaAIMove(board, playerIndex, "easy", rows, cols, playersLength);
  }
}
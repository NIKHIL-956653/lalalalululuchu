// js/ai.js
// SMART AI (Connected to Heuristic)

import { capacity, neighbors } from "./board.js"; 
import { simulateBoardState, minimax } from "./ai-core.js"; 
// --- CRITICAL CHANGE: We import the evaluation function from your new file ---
import { evaluateBoard } from "./ai-heuristic.js";

export function makeAIMove(board, playerIndex, difficulty, rows, cols, playersLength) {
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

  // --- EASY MODE (Random but valid) ---
  if (difficulty === "easy") {
      return valid[Math.floor(Math.random() * valid.length)];
  }

  // --- HARD / MEDIUM MODE (Uses your new Heuristic) ---
  if (difficulty === "hard" || difficulty === "medium") {
    // Determine depth based on difficulty
    const searchDepth = (difficulty === "hard") ? 2 : 1; 
    
    let bestMove = null;
    let bestVal = -Infinity;
    
    // Shuffle moves so it doesn't always pick the top-left if scores are tied
    valid.sort(() => Math.random() - 0.5); 

    // optimization: If too many moves, just pick a safe random one to prevent lag on mobile
    if (valid.length > 40) return valid[Math.floor(Math.random() * valid.length)];

    for (const move of valid) {
      // 1. Simulate what happens if we move here
      const nextBoard = simulateBoardState(board, move.x, move.y, playerIndex, rows, cols);
      
      if (nextBoard) {
        // 2. Use your HEURISTIC function to score this new board state
        const val = evaluateBoard(nextBoard, playerIndex, rows, cols);
        
        if (val > bestVal) {
          bestVal = val;
          bestMove = move;
        }
      }
    }
    return bestMove || valid[Math.floor(Math.random() * valid.length)];
  }
}
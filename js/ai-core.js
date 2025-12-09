// js/ai-core.js
// CENTRAL CORE LOGIC: Contains the UI-less simulation and Minimax search used by all AI modules.

import { capacity, neighbors } from "./board.js";

// Utility for adding a small random factor to scores (Jitter)
export const jitter = (amt = 0.2) => (Math.random() * amt - amt / 2);

/**
 * Executes a move (x, y) on a cloned board and runs the chain reaction.
 * This is the UI-LESS Sandbox function, crucial for AI lookahead.
 */
export function simulateBoardState(initialBoard, x, y, who, rows, cols) {
    // Deep Clone (The Sandbox)
    const clone = initialBoard.map(row => row.map(c => ({ ...c })));
    
    // Check legality 
    if (clone[y][x].owner !== -1 && clone[y][x].owner !== who) return null;
    if (clone[y][x].isBlocked) return null; 

    // Add Atom
    clone[y][x].owner = who;
    clone[y][x].count += 1;

    // Resolve Reactions (Pure Logic - your existing loop)
    const q = [];
    for (let yy = 0; yy < rows; yy++) {
        for (let xx = 0; xx < cols; xx++) {
            if (clone[yy][xx].isBlocked) continue; 
            if (clone[yy][xx].count >= capacity(xx, yy, rows, cols)) q.push([xx, yy]);
        }
    }

    let loops = 0;
    const MAX_LOOPS = 400; // Your existing circuit breaker
    
    while (q.length) {
        if (loops++ > MAX_LOOPS) break; 
        const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))].map(s => s.split(",").map(Number));
        q.length = 0;
        
        for (const [cx, cy] of wave) {
            const cap = capacity(cx, cy, rows, cols);
            const cell = clone[cy][cx];
            if (cell.count < cap) continue;

            cell.count -= cap;
            if (cell.count === 0) cell.owner = -1;

            for (const [nx, ny] of neighbors(cx, cy, rows, cols, clone)) {
                const n = clone[ny][nx];
                n.owner = who; 
                n.count += 1;
                if (n.count >= capacity(nx, ny, rows, cols)) q.push([nx, ny]);
            }
        }
    }
    return clone;
}

/**
 * Scores a board state from the perspective of the AI player (used by Minimax).
 */
export function evaluateBoard(boardState, playerIndex, rows, cols) {
    let score = 0;
    let myOrbs = 0, oppOrbs = 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = boardState[y][x];
            if (cell.isBlocked) continue;

            if (cell.owner === playerIndex) {
                myOrbs += cell.count;
                score += cell.count * 10;
                if (cell.count + 1 >= capacity(x, y, rows, cols)) score += 50; 
            } else if (cell.owner !== -1) {
                oppOrbs += cell.count;
                score -= cell.count * 12;
                if (cell.count + 1 >= capacity(x, y, rows, cols)) score -= 60; 
            }
        }
    }

    // Win/Loss Condition
    if (oppOrbs > 0 && myOrbs === 0) return -1000000;
    if (myOrbs > 0 && oppOrbs === 0) return 1000000;

    score += (myOrbs - oppOrbs) * 20;
    return score;
}


/**
 * Minimax algorithm with Alpha-Beta Pruning.
 */
export function minimax(boardState, depth, isMaximizing, aiPlayerIndex, playersLength, rows, cols, alpha, beta) {
    const currentEval = evaluateBoard(boardState, aiPlayerIndex, rows, cols);
    
    // Check terminal states or depth limit
    if (Math.abs(currentEval) >= 1000000 || depth === 0) return currentEval;

    const currentPlayer = isMaximizing ? aiPlayerIndex : (aiPlayerIndex + 1) % playersLength;
    
    // Generate legal moves
    const moves = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const c = boardState[y][x];
            if (!c.isBlocked && (c.owner === -1 || c.owner === currentPlayer)) {
                moves.push({ x, y });
            }
        }
    }

    if (moves.length === 0) return currentEval;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const m of moves) {
            const nextBoard = simulateBoardState(boardState, m.x, m.y, currentPlayer, rows, cols);
            if (!nextBoard) continue;
            
            const ev = minimax(nextBoard, depth - 1, false, aiPlayerIndex, playersLength, rows, cols, alpha, beta);
            maxEval = Math.max(maxEval, ev);
            
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const m of moves) {
            const nextBoard = simulateBoardState(boardState, m.x, m.y, currentPlayer, rows, cols);
            if (!nextBoard) continue;
            
            const ev = minimax(nextBoard, depth - 1, true, aiPlayerIndex, playersLength, rows, cols, alpha, beta);
            minEval = Math.min(minEval, ev);
            
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}
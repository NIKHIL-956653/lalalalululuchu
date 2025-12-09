// js/greedy.js
// SIMPLE GREEDY AI: Looks 1 move ahead and maximizes its own orb count.

// Import the essential functions from the new core brain file
import { simulateBoardState, jitter } from "./ai-core.js"; 

/**
 * Finds the best move by simulating all possibilities and picking the one
 * that results in the highest personal orb count.
 */
export function makeGreedyAIMove(board, playerIndex, rows, cols) {
    let bestMove = null;
    let maxOrbs = -Infinity;
    const candidates = [];

    // 1. Find all legal moves
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = board[y][x];
            if (!cell.isBlocked && (cell.owner === -1 || cell.owner === playerIndex)) {
                candidates.push({ x, y });
            }
        }
    }
    
    if (candidates.length === 0) return null;

    // 2. Evaluate each move using the core simulation
    for (const move of candidates) {
        // Use the centralized UI-less simulation from ai-core.js
        const nextBoard = simulateBoardState(board, move.x, move.y, playerIndex, rows, cols);

        if (nextBoard) {
            let myOrbs = 0;
            // Calculate the total orb count for the current player after the move
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (nextBoard[y][x].owner === playerIndex) {
                        myOrbs += nextBoard[y][x].count;
                    }
                }
            }
            
            // Add a small random factor to break ties (using jitter from ai-core.js)
            const moveScore = myOrbs + jitter(0.01); 

            if (moveScore > maxOrbs) {
                maxOrbs = moveScore;
                bestMove = move;
            }
        }
    }
    
    return bestMove || candidates[Math.floor(Math.random() * candidates.length)];
}
/* js/ai.js - God-Mode Intelligence with Professional Prediction Engine */
import { capacity, neighbors } from "./board.js";

const WIN_SCORE = 10000;
const LOS_SCORE = -10000;

/**
 * STATIC BOARD EVALUATOR
 * Calculates the strategic value of the board state.
 */
function evaluateBoard(board, player, rows, cols) {
    let score = 0;
    let myOrbs = 0;
    let enemyOrbs = 0;
    const opponent = 1 - player;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = board[y][x];
            if (cell.owner === -1 || cell.isBlocked) continue;
            const maxcp = capacity(x, y, rows, cols);

            if (cell.owner === player) {
                myOrbs += cell.count;
                let crit_enm = 0;
                const is_crit = (cell.count === maxcp - 1);

                for (const [nx, ny] of neighbors(x, y, rows, cols, board)) {
                    const nb = board[ny][nx];
                    const nb_maxcp = capacity(nx, ny, rows, cols);
                    if (nb.owner === opponent && nb.count === nb_maxcp - 1) crit_enm++;
                }

                score += cell.count;
                
                // INTELLIGENCE: Prefer Corners/Edges even if not critical yet
                if (maxcp === 2) score += 3; // Corner priority
                if (maxcp === 3) score += 1; // Edge priority

                // Penalty for being near enemy threats
                score -= crit_enm * (5 - maxcp); 

                if (crit_enm === 0 && is_crit) score += 2; // Safe Critical bonus
            } else {
                enemyOrbs += cell.count;
            }
        }
    }

    if (myOrbs > 0 && enemyOrbs === 0) return WIN_SCORE;
    if (myOrbs === 0 && enemyOrbs > 0) return LOS_SCORE;
    return score;
}

function simulateBoardState(initialBoard, x, y, player, rows, cols) {
    const clone = initialBoard.map(row => row.map(c => ({ ...c })));
    clone[y][x].owner = player;
    clone[y][x].count++;
    const workQueue = [[x, y]];
    let loops = 0;
    while (workQueue.length > 0 && loops++ < 500) {
        const [cx, cy] = workQueue.shift();
        const maxcp = capacity(cx, cy, rows, cols);
        const cell = clone[cy][cx];
        if (cell.count < maxcp) continue;
        cell.count -= maxcp;
        if (cell.count === 0) cell.owner = -1;
        for (const [nx, ny] of neighbors(cx, cy, rows, cols, clone)) {
            clone[ny][nx].owner = player;
            clone[ny][nx].count++;
            if (clone[ny][nx].count >= capacity(nx, ny, rows, cols)) workQueue.push([nx, ny]);
        }
    }
    return clone;
}

function minimax(board, depth, alpha, beta, isMax, player, rows, cols) {
    const evalScore = evaluateBoard(board, player, rows, cols);
    if (depth === 0 || Math.abs(evalScore) >= WIN_SCORE) return evalScore;

    const currentPlayer = isMax ? player : 1 - player;
    const moves = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (board[y][x].owner === -1 || board[y][x].owner === currentPlayer) moves.push({ x, y });
        }
    }

    if (isMax) {
        let maxEval = LOS_SCORE;
        for (const m of moves) {
            const nextState = simulateBoardState(board, m.x, m.y, player, rows, cols);
            maxEval = Math.max(maxEval, minimax(nextState, depth - 1, alpha, beta, false, player, rows, cols));
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = WIN_SCORE;
        for (const m of moves) {
            const nextState = simulateBoardState(board, m.x, m.y, 1 - player, rows, cols);
            minEval = Math.min(minEval, minimax(nextState, depth - 1, alpha, beta, true, player, rows, cols));
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

/**
 * MAIN AI INTERFACE
 * Standard move logic for opponent players.
 */
export function makeAIMove(board, player, difficulty, rows, cols) {
    const valid = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (board[y][x].owner === -1 || board[y][x].owner === player) valid.push({ x, y });
        }
    }

    let depth = (difficulty === "hard") ? 3 : 2; // Difficulty scaling
    const occupancy = board.flat().filter(c => c.owner !== -1).length / (rows * cols);
    if (occupancy > 0.6) depth = 2; // Performance fallback

    let bestMoves = [];
    let bestVal = -Infinity;
    let alpha = LOS_SCORE;

    for (const m of valid) {
        const nextState = simulateBoardState(board, m.x, m.y, player, rows, cols);
        const val = minimax(nextState, depth - 1, alpha, WIN_SCORE, false, player, rows, cols);
        
        if (val > bestVal) {
            bestVal = val;
            bestMoves = [m];
        } else if (val === bestVal) {
            bestMoves.push(m);
        }
        alpha = Math.max(alpha, bestVal);
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || valid[0];
}

/**
 * PROFESSIONAL PREDICTION ENGINE (HINT SYSTEM)
 * Specifically designed to provide the highest-tier strategic move for the player.
 */
export function getProfessionalHint(board, player, rows, cols) {
    // Force a deeper lookahead for the "System Forecast"
    const depth = 4; 
    const valid = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (board[y][x].owner === -1 || board[y][x].owner === player) valid.push({ x, y });
        }
    }

    let bestMove = null;
    let bestVal = -Infinity;
    let alpha = LOS_SCORE;

    for (const m of valid) {
        const nextState = simulateBoardState(board, m.x, m.y, player, rows, cols);
        const val = minimax(nextState, depth - 1, alpha, WIN_SCORE, false, player, rows, cols);
        
        if (val > bestVal) {
            bestVal = val;
            bestMove = m;
        }
        alpha = Math.max(alpha, bestVal);
    }
    
    return bestMove;
}
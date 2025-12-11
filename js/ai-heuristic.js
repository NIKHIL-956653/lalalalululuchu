// js/ai-heuristic.js
import { capacity, neighbors } from "./board.js";

/**
 * Evaluates the board state using the official heuristic strategy.
 * @param {Array} board - The 2D grid of cells.
 * @param {number} player - The player ID (e.g., 1 for AI).
 * @param {number} rows - Total rows.
 * @param {number} cols - Total columns.
 * @returns {number} Score (higher is better).
 */
export function evaluateBoard(board, player, rows, cols) {
    let score = 0;
    let myOrbs = 0;
    let enemyOrbs = 0;

    // Helper: Is this cell critical? (Orbs == Capacity - 1)
    const isCritical = (cell, x, y) => {
        return cell.count === capacity(x, y, rows, cols) - 1;
    };

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = board[y][x];
            if (cell.owner === -1 || cell.isBlocked) continue;

            const isMe = cell.owner === player;
            
            if (isMe) {
                myOrbs += cell.count;
                
                // Rule 1: Add 1 for every orb of the player's color
                score += cell.count;

                // Rule 2: Check for contiguous critical blocks
                if (isCritical(cell, x, y)) {
                    score += 2; // Base bonus for being critical
                    
                    // Check neighbors for "Contiguous Critical" bonus
                    const adj = neighbors(x, y, rows, cols, board);
                    for (const [nx, ny] of adj) {
                        const neighbor = board[ny][nx];
                        if (neighbor.owner === player && isCritical(neighbor, nx, ny)) {
                            score += 2; // Add twice the number of cells in the block
                        }
                    }
                }

                // Rule 3: Check Surroundings for enemy threats
                const adj = neighbors(x, y, rows, cols, board);
                let enemyCriticalNearby = false;

                for (const [nx, ny] of adj) {
                    const neighbor = board[ny][nx];
                    if (neighbor.owner !== -1 && neighbor.owner !== player) {
                        // Enemy detected
                        if (isCritical(neighbor, nx, ny)) {
                            enemyCriticalNearby = true;
                            // Rule 4: Subtract (5 - critical_mass) for every enemy critical cell nearby
                            const cap = capacity(nx, ny, rows, cols);
                            score -= (5 - cap);
                        }
                    }
                }

                // Rule 5: If NO critical enemy cells nearby, add positional bonuses
                if (!enemyCriticalNearby) {
                    const cap = capacity(x, y, rows, cols);
                    if (cap === 2) score += 3; // Corner Bonus
                    else if (cap === 3) score += 2; // Edge Bonus
                    
                    if (isCritical(cell, x, y)) score += 2; // Safe critical bonus
                }

            } else {
                enemyOrbs += cell.count;
            }
        }
    }

    // Win/Loss States (Huge values to force the AI to pick winning moves)
    if (myOrbs > 0 && enemyOrbs === 0) return 10000;
    if (myOrbs === 0 && enemyOrbs > 0) return -10000;

    return score;
}
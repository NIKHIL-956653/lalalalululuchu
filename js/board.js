/* js/board.js - Component-Aware Board Engine (Merged: Photorealistic Electrician + Energy Aura) */

const el = (t, c, attrs = {}) => {
  const n = document.createElement(t);
  if (c) n.className = c;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// CAPACITY LOGIC
export const capacity = (x, y, rows, cols) => {
  const edges = [y == 0, y == rows - 1, x == 0, x == cols - 1].filter(Boolean).length;
  return edges === 2 ? 2 : edges === 1 ? 3 : 4;
};

// NEIGHBORS (Wall Aware and Block-Check)
export const neighbors = (x, y, rows, cols, board) => {
  const n = [];
  const potential = [];
  if (x > 0) potential.push([x - 1, y]);
  if (x < cols - 1) potential.push([x + 1, y]);
  if (y > 0) potential.push([x, y - 1]);
  if (y < rows - 1) potential.push([x, y + 1]);

  for (const [nx, ny] of potential) {
    if (board[ny] && board[ny][nx] && board[ny][nx].isBlocked === false) {
      n.push([nx, ny]);
    }
  }
  return n;
};

// BOMB LOGIC PRESERVED FOR CLASSIC THEMES
export function makeBombSVG(color) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.classList.add("bombsvg");

  const body = document.createElementNS(ns, "circle");
  body.setAttribute("cx", "32");
  body.setAttribute("cy", "36");
  body.setAttribute("r", "16");
  body.setAttribute("fill", color);
  body.setAttribute("filter", `drop-shadow(0 0 14px ${color})`);
  svg.appendChild(body);

  return svg;
}

/**
 * ELECTRICIAN: Photorealistic component images
 * Uses CSS for aura + bulge. (No forced tint here.)
 */
function makeElectricianIMG(count) {
  const img = document.createElement("img");
  img.className = "component-img";

  if (count === 1) {
    img.src = "assets/ceramic_diskcapacitor_small.png";
  } else if (count === 2) {
    img.src = "assets/axial_resistor_medium.png";
  } else {
    img.src = "assets/integrated_circuit.png"; // count >= 3
  }

  img.draggable = false;
  img.alt = "component";

  return img;
}

/**
 * Apply aura hooks for CSS:
 * - data-player="0/1/2..."
 * - --aura: player color
 */
function applyAura(cellEl, ownerIndex, players) {
  if (ownerIndex === -1 || ownerIndex == null) {
    cellEl.removeAttribute("data-player");
    cellEl.style.removeProperty("--aura");
    return;
  }

  cellEl.setAttribute("data-player", String(ownerIndex));
  const aura = players?.[ownerIndex]?.color || "#00ffff";
  cellEl.style.setProperty("--aura", aura);
}

// MAIN RENDER ENGINE
export function drawCell(x, y, board, boardEl, cols, players, current, withPulse = false) {
  const idx = y * cols + x;
  const cellEl = boardEl.children[idx];
  if (!cellEl) return;

  const data = board[y][x];
  const rows = board.length;
  const isElectrician = document.body.classList.contains("theme-electrician");

  // Clear + reset
  cellEl.innerHTML = "";
  cellEl.classList.remove("owned", "pulse", "blocked", "critical");

  // Blocked cell
  if (data.isBlocked) {
    cellEl.classList.add("blocked");
    cellEl.removeAttribute("data-player");
    cellEl.style.removeProperty("--aura");
    return;
  }

  // Owned + aura data attribute
  const isOwned = data.owner !== -1;
  cellEl.classList.toggle("owned", isOwned);
  applyAura(cellEl, data.owner, players);

  // Critical: one move before explosion
  const cap = capacity(x, y, rows, cols);
  const isCrit = data.count === cap - 1 && data.count > 0;
  cellEl.classList.toggle("critical", isCrit);

  // Pulse effect (legacy glow variable)
  if (withPulse) {
    cellEl.classList.add("pulse");
    if (players?.[current]) cellEl.style.setProperty("--glow", players[current].color);
  }

  // Nothing to render
  if (data.count === 0) return;

  // Player color (fallback for legacy modes)
  const playerColor = players?.[data.owner]?.color || "#ccc";

  // RENDER
  if (isElectrician) {
    cellEl.appendChild(makeElectricianIMG(data.count));
  } else {
    // ORIGINAL NEON ORB LOGIC
    if (data.count === 1) {
      const o = el("div", "orb one");
      o.style.background = playerColor;
      cellEl.appendChild(o);
    } else if (data.count === 2) {
      const wrap = el("div", "pair-improved");
      const a = el("div", "orb two-orb");
      const b = el("div", "orb two-orb");
      a.style.background = playerColor;
      b.style.background = playerColor;
      wrap.append(a, b);
      cellEl.appendChild(wrap);
    } else {
      cellEl.appendChild(makeBombSVG(playerColor));
    }
  }
}

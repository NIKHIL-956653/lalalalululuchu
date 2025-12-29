/* js/board.js - Complete Wall-Aware Board Engine */

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
    // Check if the coordinate is within bounds and NOT blocked
    if (board[ny] && board[ny][nx] && board[ny][nx].isBlocked === false) {
      n.push([nx, ny]);
    }
  }
  return n;
};

// GRAPHICS: BOMB SVG GENERATOR
export function makeBombSVG(color) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.classList.add("bombsvg");

  const body = document.createElementNS(ns, "circle");
  body.setAttribute("cx", "32"); body.setAttribute("cy", "36"); body.setAttribute("r", "16");
  body.setAttribute("fill", color); body.setAttribute("filter", `drop-shadow(0 0 14px ${color})`);
  svg.appendChild(body);

  const shine = document.createElementNS(ns, "circle");
  shine.setAttribute("cx", "26"); shine.setAttribute("cy", "30"); shine.setAttribute("r", "6");
  shine.setAttribute("fill", "#fff"); shine.setAttribute("opacity", ".22"); 
  svg.appendChild(shine);

  const fuse = document.createElementNS(ns, "rect");
  fuse.setAttribute("x", "29"); fuse.setAttribute("y", "16"); fuse.setAttribute("width", "6"); fuse.setAttribute("height", "8"); fuse.setAttribute("rx", "2");
  fuse.setAttribute("fill", "#c9a777"); 
  svg.appendChild(fuse);

  const spark = document.createElementNS(ns, "circle");
  spark.setAttribute("cx", "32"); spark.setAttribute("cy", "16"); spark.setAttribute("r", "4");
  spark.setAttribute("fill","#ffd54a"); spark.setAttribute("filter","drop-shadow(0 0 8px #ffd54a)");
  svg.appendChild(spark);

  return svg;
}

// MAIN RENDER ENGINE
export function drawCell(x, y, board, boardEl, cols, players, current, withPulse = false) {
  const idx = y * cols + x;
  const cellEl = boardEl.children[idx];
  const data = board[y][x];
  const rows = board.length;

  cellEl.innerHTML = "";
  cellEl.classList.remove("owned", "pulse", "blocked", "critical");
  
  if (data.isBlocked) {
    cellEl.classList.add("blocked");
    return;
  }
  
  cellEl.classList.toggle("owned", data.owner !== -1);

  // SYSTEM SHOCK: Activate red vibration alert when cell is one move from exploding
  const isCrit = data.count === capacity(x, y, rows, cols) - 1 && data.count > 0;
  cellEl.classList.toggle('critical', isCrit);

  if (withPulse) { 
    cellEl.classList.add("pulse"); 
    if(players[current]) cellEl.style.setProperty("--glow", players[current].color); 
  }

  if (data.count === 0) return;

  const color = players[data.owner]?.color || "#ccc";

  // DRAW DIFFERENT ORB STATES
  if (data.count === 1) {
    const o = el("div", "orb one"); o.style.background = color; o.style.color = color; cellEl.appendChild(o);
  } else if (data.count === 2) {
    const wrap = el("div", "pair-improved");
    const a = el("div", "orb two-orb"), b = el("div", "orb two-orb");
    a.style.background = color; b.style.background = color; wrap.append(a, b); cellEl.appendChild(wrap);
  } else {
    // CAP + ORBS STATE: SHOW BOMB
    cellEl.appendChild(makeBombSVG(color));
  }
}
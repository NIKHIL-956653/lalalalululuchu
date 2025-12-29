const $ = s => document.querySelector(s);
const el = (t, c, attrs = {}) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
};

export const defaultColors = ["#ff4757", "#1e90ff", "#2ed573", "#ecc668", "#FFA500", "#800080"];

export function buildPlayerSettings(count, players, playerTypes, resetFunc, updateFunc, current) {
  const container = $("#playerSettingsContainer");
  container.innerHTML = "";

  if (players.length !== count) {
      players.length = count;
      playerTypes.length = count;
      for (let i = 0; i < count; i++) {
          if (!players[i]) players[i] = { name: `Player ${i + 1}`, color: defaultColors[i] || "#ffffff" };
          if (!playerTypes[i]) playerTypes[i] = { type: "human", difficulty: null };
      }
      resetFunc();
  }

  for (let i = 0; i < count; i++) {
    const div = el("div", "player-setting");
    const labelName = el("label", ""); labelName.textContent = `Player ${i + 1} Name: `;
    const nameInput = el("input", "", { type: "text", placeholder: `Player ${i + 1}`, value: players[i].name });
    labelName.appendChild(nameInput);

    const typeSelect = el("select", "");
    // REMOVED MEDIUM OPTION - Easy and Hard Only
    typeSelect.innerHTML = `
      <option value="human" ${playerTypes[i].type === 'human' ? 'selected' : ''}>Human</option>
      <option value="easy" ${playerTypes[i].difficulty === 'easy' ? 'selected' : ''}>Easy (Smart)</option>
      <option value="hard" ${playerTypes[i].difficulty === 'hard' ? 'selected' : ''}>Hard (Master 💀)</option>
    `;
    
    const labelP = el("label", ""); labelP.textContent = ` Color: `;
    const colorInput = el("input", "", { type: "color", value: players[i].color });
    labelP.appendChild(colorInput);

    nameInput.addEventListener("input", (e) => {
      players[i].name = e.target.value.trim() || `Player ${i + 1}`;
      updateFunc(false);
    });
    colorInput.addEventListener("input", (e) => {
      players[i].color = e.target.value;
      updateFunc(false);
    });
    typeSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      playerTypes[i] = (val === "human") ? { type: "human", difficulty: null } : { type: "ai", difficulty: val };
      if (i === current) updateFunc(true);
    });

    div.append(labelName, typeSelect, labelP);
    container.appendChild(div);
  }
}
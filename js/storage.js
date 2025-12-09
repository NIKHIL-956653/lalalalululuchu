// js/storage.js
const STORAGE_KEY = 'neon_chain_reaction_v1';

// Default State (Now includes settings for Theme)
const defaultData = {
    settings: {
        theme: 'default' // Default theme
    },
    stats: {
        matches: 0,
        wins: { easy: 0, greedy: 0, hard: 0 },
        losses: 0
    },
    achievements: [] // Array of unlocked achievement IDs
};

// Load Data
export function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;

    // Merge with defaultData to ensure new fields (like settings) exist 
    // even if the user has old data saved.
    const parsed = JSON.parse(raw);
    return { 
        ...defaultData, 
        ...parsed, 
        settings: { ...defaultData.settings, ...parsed.settings }
    };
}

// Save Data Helper
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- NEW: THEME FUNCTIONS ---
export function saveTheme(themeClass) {
    const data = loadData();
    data.settings.theme = themeClass;
    saveData(data);
}

export function getSavedTheme() {
    const data = loadData();
    return data.settings.theme;
}
// ----------------------------

// Update Stats after a game
export function recordGameEnd(winnerIndex, aiDifficulty) {
    const data = loadData();
    data.stats.matches++;
    
    if (winnerIndex === 0) { // Player (You) won
        if (aiDifficulty && data.stats.wins[aiDifficulty] !== undefined) {
            data.stats.wins[aiDifficulty]++;
        }
    } else {
        data.stats.losses++;
    }
    saveData(data);
    return data.stats;
}

// Check & Unlock Achievement
export function tryUnlockAchievement(id, title, desc) {
    const data = loadData();
    if (!data.achievements.includes(id)) {
        data.achievements.push(id);
        saveData(data);
        showAchievementToast(title, desc);
        return true;
    }
    return false;
}

// UI: Show Toast Notification
function showAchievementToast(title, desc) {
    const container = document.getElementById('achievement-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="icon">🏆</div>
        <div class="text">
            <div class="title">${title}</div>
            <div class="desc">${desc}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
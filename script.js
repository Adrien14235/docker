const GAME_DURATION_SEC = 5;
const API_URL = "http://localhost:3000/api/scores";

let score = 0;
let timeLeft = GAME_DURATION_SEC;
let timerInterval = null;
let isPlaying = false;
let isGameOver = false;

function getClickButton() {
  return document.getElementById("button-clicker") || document.getElementById("click-btn");
}

function getResetButton() {
  return document.getElementById("button-reset") || document.getElementById("reset-btn");
}

function getScoreDisplay() {
  return document.getElementById("score");
}

function getTimerDisplay() {
  return document.getElementById("timer");
}

function getMessageDisplay() {
  return document.getElementById("game-message");
}

function getScoreboardSection() {
  return document.getElementById("scoreboard-section");
}

function getPlayerNameInput() {
  return document.getElementById("player-name");
}

function getSaveScoreButton() {
  return document.getElementById("save-score-btn");
}

function getScoresList() {
  return document.getElementById("scores-list");
}

function updateDisplays() {
  const scoreDisplay = getScoreDisplay();
  const timerDisplay = getTimerDisplay();

  if (scoreDisplay) {
    scoreDisplay.textContent = score;
  }
  if (timerDisplay) {
    const formatted = typeof timeLeft === "number" ? timeLeft.toFixed(1) : parseFloat(timeLeft).toFixed(1);
    timerDisplay.textContent = `${formatted}s`;
  }
}

function startGame() {
  isPlaying = true;
  isGameOver = false;
  score = 0;
  timeLeft = GAME_DURATION_SEC;
  updateDisplays();

  const messageDisplay = getMessageDisplay();
  if (messageDisplay) {
    messageDisplay.textContent = "C'est parti ! Cliquez le plus vite possible !";
    messageDisplay.classList.remove("finished");
  }

  const scoreboardSection = getScoreboardSection();
  if (scoreboardSection) {
    scoreboardSection.classList.add("hidden");
  }

  const startTime = Date.now();
  const totalMs = GAME_DURATION_SEC * 1000;

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsed);
    timeLeft = (remainingMs / 1000).toFixed(1);

    const timerDisplay = getTimerDisplay();
    if (timerDisplay) {
      timerDisplay.textContent = `${timeLeft}s`;
    }

    if (remainingMs <= 0) {
      endGame();
    }
  }, 100);
}

function endGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPlaying = false;
  isGameOver = true;
  timeLeft = "0.0";

  const timerDisplay = getTimerDisplay();
  if (timerDisplay) {
    timerDisplay.textContent = "0.0s";
  }

  const clickBtn = getClickButton();
  if (clickBtn) {
    clickBtn.disabled = true;
  }

  const cps = (score / GAME_DURATION_SEC).toFixed(1);
  const messageDisplay = getMessageDisplay();
  if (messageDisplay) {
    messageDisplay.textContent = `Temps écoulé ! Score final : ${score} clics (${cps} clics/sec).`;
    messageDisplay.classList.add("finished");
  }

  const scoreboardSection = getScoreboardSection();
  if (scoreboardSection) {
    scoreboardSection.classList.remove("hidden");
  }

  const saveScoreBtn = getSaveScoreButton();
  if (saveScoreBtn) {
    saveScoreBtn.disabled = false;
  }

  loadLeaderboard();
}

function handleClick() {
  if (isGameOver) {
    return;
  }

  if (!isPlaying) {
    startGame();
  }

  score++;
  updateDisplays();
}

function resetGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPlaying = false;
  isGameOver = false;
  score = 0;
  timeLeft = GAME_DURATION_SEC;

  const clickBtn = getClickButton();
  if (clickBtn) {
    clickBtn.disabled = false;
  }

  updateDisplays();

  const messageDisplay = getMessageDisplay();
  if (messageDisplay) {
    messageDisplay.textContent = "Cliquez sur le bouton pour lancer le chrono !";
    messageDisplay.classList.remove("finished");
  }

  const scoreboardSection = getScoreboardSection();
  if (scoreboardSection) {
    scoreboardSection.classList.add("hidden");
  }
}

async function loadLeaderboard() {
  const scoresList = getScoresList();
  if (!scoresList) return;

  scoresList.innerHTML = '<p class="loading">Chargement des meilleurs scores...</p>';
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    renderScores(data.scores || []);
  } catch (err) {
    scoresList.innerHTML = `
      <p style="color: #f43f5e;">⚠️ Impossible de charger les scores (${err.message}). L'API est peut-être hors ligne.</p>
    `;
  }
}

function renderScores(scores) {
  const scoresList = getScoresList();
  if (!scoresList) return;

  if (scores.length === 0) {
    scoresList.innerHTML = "<p>Aucun score enregistré pour le moment. Soyez le premier !</p>";
    return;
  }

  const items = scores.map((s, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
    const dateStr = s.created_at ? new Date(s.created_at).toLocaleTimeString() : "";
    return `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #334155;">
        <span>${medal} <strong>${escapeHtml(s.username)}</strong></span>
        <span><strong>${s.score}</strong> clics <small style="color: #94a3b8;">${dateStr}</small></span>
      </div>
    `;
  }).join("");

  scoresList.innerHTML = items;
}

async function handleSaveScore() {
  const playerNameInput = getPlayerNameInput();
  const saveScoreBtn = getSaveScoreButton();
  if (!playerNameInput || !saveScoreBtn) return;

  const username = playerNameInput.value.trim();
  if (!username) {
    alert("Veuillez renseigner un pseudo.");
    return;
  }

  saveScoreBtn.disabled = true;
  saveScoreBtn.textContent = "Envoi...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        score: score
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erreur lors de l'enregistrement");
    }

    saveScoreBtn.textContent = "Enregistré !";
    playerNameInput.value = "";
    await loadLeaderboard();
  } catch (err) {
    alert(`Échec de l'enregistrement : ${err.message}`);
    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = "Réessayer";
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function handleGameButton() {
  const clickBtn = getClickButton();
  if (clickBtn) {
    clickBtn.addEventListener("click", handleClick);
  }
}

function handleResetButton() {
  const resetBtn = getResetButton();
  if (resetBtn) {
    resetBtn.addEventListener("click", resetGame);
  }
}

function initGame() {
  handleGameButton();
  handleResetButton();

  const saveScoreBtn = getSaveScoreButton();
  if (saveScoreBtn) {
    saveScoreBtn.addEventListener("click", handleSaveScore);
  }

  updateDisplays();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
  } else {
    initGame();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    handleClick,
    resetGame,
    startGame,
    endGame,
    handleGameButton,
    handleResetButton,
    initGame,
    updateDisplays,
    getScore: () => score,
    setScore: (v) => { score = v; updateDisplays(); },
    getIsPlaying: () => isPlaying,
    getIsGameOver: () => isGameOver,
    getTimeLeft: () => timeLeft,
    GAME_DURATION_SEC
  };
}

const GAME_DURATION_SEC = 5;
const API_URL = "http://localhost:3000/api/scores";

let score = 0;
let timeLeft = GAME_DURATION_SEC;
let timerInterval = null;
let isPlaying = false;
let isGameOver = false;

const clickBtn = document.getElementById("click-btn");
const resetBtn = document.getElementById("reset-btn");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const messageDisplay = document.getElementById("game-message");
const scoreboardSection = document.getElementById("scoreboard-section");
const playerNameInput = document.getElementById("player-name");
const saveScoreBtn = document.getElementById("save-score-btn");
const scoresList = document.getElementById("scores-list");

function startGame() {
  isPlaying = true;
  isGameOver = false;
  score = 0;
  timeLeft = GAME_DURATION_SEC;
  updateDisplays();

  messageDisplay.textContent = "C'est parti ! Cliquez le plus vite possible !";
  messageDisplay.classList.remove("finished");
  scoreboardSection.classList.add("hidden");

  const startTime = Date.now();
  const totalMs = GAME_DURATION_SEC * 1000;

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsed);
    timeLeft = (remainingMs / 1000).toFixed(1);
    timerDisplay.textContent = `${timeLeft}s`;

    if (remainingMs <= 0) {
      endGame();
    }
  }, 100);
}

function endGame() {
  clearInterval(timerInterval);
  isPlaying = false;
  isGameOver = true;
  timeLeft = "0.0";
  timerDisplay.textContent = "0.0s";
  clickBtn.disabled = true;

  const cps = (score / GAME_DURATION_SEC).toFixed(1);
  messageDisplay.textContent = `Temps écoulé ! Score final : ${score} clics (${cps} clics/sec).`;
  messageDisplay.classList.add("finished");
  scoreboardSection.classList.remove("hidden");
  saveScoreBtn.disabled = false;
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
  scoreDisplay.textContent = score;
}

function resetGame() {
  clearInterval(timerInterval);
  isPlaying = false;
  isGameOver = false;
  score = 0;
  timeLeft = GAME_DURATION_SEC;
  clickBtn.disabled = false;
  updateDisplays();
  messageDisplay.textContent = "Cliquez sur le bouton pour lancer le chrono !";
  messageDisplay.classList.remove("finished");
  scoreboardSection.classList.add("hidden");
}

function updateDisplays() {
  scoreDisplay.textContent = score;
  timerDisplay.textContent = `${parseFloat(timeLeft).toFixed(1)}s`;
}

async function loadLeaderboard() {
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

clickBtn.addEventListener("click", handleClick);
resetBtn.addEventListener("click", resetGame);
saveScoreBtn.addEventListener("click", handleSaveScore);

updateDisplays();

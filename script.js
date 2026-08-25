const GAME_DURATION_SEC = 5;

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

function startGame() {
  isPlaying = true;
  isGameOver = false;
  score = 0;
  timeLeft = GAME_DURATION_SEC;
  updateDisplays();

  messageDisplay.textContent = "C'est parti ! Cliquez le plus vite possible !";
  messageDisplay.classList.remove("finished");

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
}

function updateDisplays() {
  scoreDisplay.textContent = score;
  timerDisplay.textContent = `${parseFloat(timeLeft).toFixed(1)}s`;
}

clickBtn.addEventListener("click", handleClick);
resetBtn.addEventListener("click", resetGame);

updateDisplays();

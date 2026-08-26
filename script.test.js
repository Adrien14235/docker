const {
  handleClick,
  resetGame,
  startGame,
  endGame,
  handleGameButton,
  handleResetButton,
  initGame,
  getScore,
  setScore,
  getIsPlaying,
  getIsGameOver,
  getTimeLeft
} = require("./script");

describe("Tests unitaires du jeu ClickFast", () => {
  beforeEach(() => {
    // 1. Notre "Faux DOM", recrée avant chaque test
    document.body.innerHTML = `
      <div id="score">0</div>
      <div id="timer">5.0s</div>
      <button id="button-clicker">Click me!</button>
      <button id="button-reset">Reset</button>
      <p id="game-message"></p>
      <div id="scoreboard-section" class="hidden"></div>
      <input type="text" id="player-name" />
      <button id="save-score-btn">Save</button>
      <div id="scores-list"></div>
    `;

    // 2. Appel de nos fonctions JS pour reinitialiser et attacher les events
    resetGame();
    handleGameButton();
    handleResetButton();
  });

  afterEach(() => {
    resetGame();
  });

  // Test pour verifier que le score s'incremente lorsque le bouton est clique
  test("Vérifiez que le score s'incrémente correctement", () => {
    const clickBtn = document.getElementById("button-clicker");
    const scoreDisplay = document.getElementById("score");

    expect(scoreDisplay.textContent).toBe("0");

    clickBtn.click();
    expect(scoreDisplay.textContent).toBe("1");
    expect(getScore()).toBe(1);

    clickBtn.click();
    clickBtn.click();
    expect(scoreDisplay.textContent).toBe("3");
    expect(getScore()).toBe(3);
  });

  // Test pour verifier que le timer decompte correctement
  test("Vérifiez que le timer décompte correctement", (done) => {
    const clickBtn = document.getElementById("button-clicker");
    const timerDisplay = document.getElementById("timer");

    clickBtn.click(); // Demarre le jeu

    setTimeout(() => {
      const timeLeft = parseFloat(timerDisplay.textContent);
      expect(timeLeft).toBeLessThan(5.0);
      resetGame();
      done();
    }, 300);
  });

  // Test pour verifier que le jeu ne permet pas de cliquer apres la fin du timer
  test("Vérifiez que le score ne s'incrémente pas après la fin du timer", () => {
    const clickBtn = document.getElementById("button-clicker");
    const scoreDisplay = document.getElementById("score");

    clickBtn.click(); // Score = 1
    clickBtn.click(); // Score = 2
    expect(getScore()).toBe(2);

    endGame(); // Fin du temps

    expect(clickBtn.disabled).toBe(true);

    clickBtn.click(); // Essai de clic supplementaire
    expect(getScore()).toBe(2);
    expect(scoreDisplay.textContent).toBe("2");
  });

  // Test pour verifier que le bouton de reinitialisation fonctionne correctement
  test("Vérifiez que le bouton de réinitialisation remet le score à zéro", () => {
    const clickBtn = document.getElementById("button-clicker");
    const resetBtn = document.getElementById("button-reset");
    const scoreDisplay = document.getElementById("score");

    clickBtn.click();
    clickBtn.click();
    clickBtn.click();
    expect(getScore()).toBe(3);
    expect(scoreDisplay.textContent).toBe("3");

    resetBtn.click();
    expect(getScore()).toBe(0);
    expect(scoreDisplay.textContent).toBe("0");
    expect(clickBtn.disabled).toBe(false);
  });
});

const grid = document.querySelector("#gameGrid");
const startButton = document.querySelector("#startGame");
const scoreOutput = document.querySelector("#score");
const bestOutput = document.querySelector("#bestScore");
const timeOutput = document.querySelector("#timeLeft");
const statusOutput = document.querySelector("#gameStatus");
const rankingScore = document.querySelector("#rankingScore");

const totalCells = 16;
let cells = [];
let activeIndex = -1;
let score = 0;
let timeLeft = 20;
let timer = null;
let isRunning = false;
let bestScore = Number(localStorage.getItem("pedrogames-best-score") || 0);

bestOutput.textContent = bestScore;
rankingScore.textContent = bestScore;

function createGrid() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < totalCells; index += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("aria-label", `Casa ${index + 1}`);
    cell.addEventListener("click", () => handleCellClick(index));
    fragment.appendChild(cell);
  }

  grid.appendChild(fragment);
  cells = Array.from(grid.querySelectorAll(".cell"));
}

function setActiveCell() {
  cells.forEach((cell) => cell.classList.remove("active", "hit"));

  let nextIndex = Math.floor(Math.random() * totalCells);
  if (nextIndex === activeIndex) {
    nextIndex = (nextIndex + 3) % totalCells;
  }

  activeIndex = nextIndex;
  cells[activeIndex].classList.add("active");
}

function updateScore(nextScore) {
  score = nextScore;
  scoreOutput.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("pedrogames-best-score", String(bestScore));
    bestOutput.textContent = bestScore;
    rankingScore.textContent = bestScore;
  }
}

function stopGame(message) {
  window.clearInterval(timer);
  timer = null;
  isRunning = false;
  activeIndex = -1;
  startButton.textContent = "Jogar de novo";
  statusOutput.textContent = message;
  cells.forEach((cell) => cell.classList.remove("active", "hit"));
}

function startGame() {
  window.clearInterval(timer);
  isRunning = true;
  timeLeft = 20;
  updateScore(0);
  timeOutput.textContent = timeLeft;
  startButton.textContent = "Reiniciar";
  statusOutput.textContent = "Acerte o quadrado aceso o mais rapido possivel.";
  setActiveCell();

  timer = window.setInterval(() => {
    timeLeft -= 1;
    timeOutput.textContent = timeLeft;

    if (timeLeft <= 0) {
      stopGame(`Fim de rodada. Sua pontuacao foi ${score}.`);
    }
  }, 1000);
}

function handleCellClick(index) {
  if (!isRunning) {
    statusOutput.textContent = "Clique em Iniciar para comecar a rodada.";
    return;
  }

  if (index !== activeIndex) {
    statusOutput.textContent = "Quase. Procure o quadrado aceso.";
    return;
  }

  cells[index].classList.remove("active");
  cells[index].classList.add("hit");
  updateScore(score + 100);
  statusOutput.textContent = "Boa! Continue.";
  window.setTimeout(setActiveCell, 120);
}

createGrid();
startButton.addEventListener("click", startGame);

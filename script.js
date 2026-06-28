const gameTitle = document.querySelector("#arcade-title");
const primaryAction = document.querySelector("#primaryAction");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const cardButtons = Array.from(document.querySelectorAll(".game-card-action"));
const screens = Array.from(document.querySelectorAll(".game-screen"));
const metricOneLabel = document.querySelector("#metricOneLabel");
const metricTwoLabel = document.querySelector("#metricTwoLabel");
const metricOne = document.querySelector("#metricOne");
const metricTwo = document.querySelector("#metricTwo");
const bestOutput = document.querySelector("#bestScore");
const statusOutput = document.querySelector("#gameStatus");
const rankReflex = document.querySelector("#rankReflex");
const rankMemory = document.querySelector("#rankMemory");
const rankDash = document.querySelector("#rankDash");

const storageKeys = {
  reflex: "pedrogames-best-reflex",
  memory: "pedrogames-best-memory",
  dash: "pedrogames-best-dash"
};

const records = {
  reflex: Number(localStorage.getItem(storageKeys.reflex) || 0),
  memory: Number(localStorage.getItem(storageKeys.memory) || 0),
  dash: Number(localStorage.getItem(storageKeys.dash) || 0)
};

let currentGame = "";

function setRecord(game, value, mode = "high") {
  const current = records[game] || 0;
  const isBetter = mode === "low" ? current === 0 || value < current : value > current;

  if (!isBetter) {
    return;
  }

  records[game] = value;
  localStorage.setItem(storageKeys[game], String(value));
  updateRecordOutputs();
}

function updateRecordOutputs() {
  rankReflex.textContent = records.reflex;
  rankMemory.textContent = records.memory === 0 ? "0" : `${records.memory} jogadas`;
  rankDash.textContent = records.dash;
  bestOutput.textContent = currentGame === "memory" && records.memory > 0
    ? `${records.memory} jogadas`
    : records[currentGame];
}

function setMetrics(firstLabel, firstValue, secondLabel, secondValue) {
  metricOneLabel.firstChild.textContent = firstLabel;
  metricOne.textContent = firstValue;
  metricTwoLabel.firstChild.textContent = secondLabel;
  metricTwo.textContent = secondValue;
}

function setStatus(message) {
  statusOutput.textContent = message;
}

function stopAllGames() {
  reflex.stop();
  memory.stop();
  dash.stop();
}

function selectGame(game) {
  const isSameGame = currentGame === game;

  if (!isSameGame) {
    stopAllGames();
  }

  currentGame = game;
  const config = games[game];

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.game === game);
  });

  screens.forEach((screen) => {
    const isActive = screen.dataset.screen === game;
    screen.hidden = !isActive;
    screen.classList.toggle("active", isActive);
  });

  if (!isSameGame) {
    gameTitle.textContent = config.title;
    primaryAction.textContent = config.action;
    setStatus(config.status);
    config.prepare();
  }

  updateRecordOutputs();
  document.querySelector("#arcade").scrollIntoView({ behavior: "smooth", block: "start" });
}

const reflex = (() => {
  const grid = document.querySelector("#reflexGrid");
  const totalCells = 16;
  let cells = [];
  let activeIndex = -1;
  let score = 0;
  let timeLeft = 20;
  let timer = null;
  let isRunning = false;

  function createGrid() {
    if (cells.length > 0) {
      return;
    }

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
    setMetrics("Tempo: ", timeLeft, "Pontos: ", score);
    setRecord("reflex", score);
  }

  function stop(message = "Pronto para outra rodada.") {
    window.clearInterval(timer);
    timer = null;
    isRunning = false;
    activeIndex = -1;
    cells.forEach((cell) => cell.classList.remove("active", "hit"));

    if (currentGame === "reflex") {
      primaryAction.textContent = "Iniciar";
      setMetrics("Tempo: ", timeLeft, "Pontos: ", score);
      setStatus(message);
    }
  }

  function start() {
    stop("");
    isRunning = true;
    score = 0;
    timeLeft = 20;
    setMetrics("Tempo: ", timeLeft, "Pontos: ", score);
    primaryAction.textContent = "Reiniciar";
    setStatus("Rodada ativa.");
    setActiveCell();

    timer = window.setInterval(() => {
      timeLeft -= 1;
      setMetrics("Tempo: ", timeLeft, "Pontos: ", score);

      if (timeLeft <= 0) {
        stop(`Fim de rodada. Pontuacao: ${score}.`);
      }
    }, 1000);
  }

  function handleCellClick(index) {
    if (!isRunning) {
      setStatus("Pronto para iniciar.");
      return;
    }

    if (index !== activeIndex) {
      setStatus("Tente o quadrado aceso.");
      return;
    }

    cells[index].classList.remove("active");
    cells[index].classList.add("hit");
    updateScore(score + 100);
    setStatus("Boa.");
    window.setTimeout(setActiveCell, 120);
  }

  function prepare() {
    createGrid();
    setMetrics("Tempo: ", timeLeft, "Pontos: ", score);
  }

  return { prepare, start, stop };
})();

const memory = (() => {
  const grid = document.querySelector("#memoryGrid");
  const baseCards = [
    { label: "A", color: "#ffd166" },
    { label: "B", color: "#3fd4e0" },
    { label: "C", color: "#ff6b6b" },
    { label: "D", color: "#78d66d" },
    { label: "E", color: "#a78bfa" },
    { label: "F", color: "#fca5a5" },
    { label: "G", color: "#86efac" },
    { label: "H", color: "#fcd34d" }
  ];
  let cards = [];
  let revealed = [];
  let matched = 0;
  let moves = 0;
  let locked = false;
  let started = false;

  function shuffle(items) {
    return items
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  function createGrid() {
    grid.innerHTML = "";
    cards = shuffle([...baseCards, ...baseCards]).map((card, index) => ({ ...card, id: index }));
    const fragment = document.createDocumentFragment();

    cards.forEach((card, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-card";
      button.textContent = card.label;
      button.style.setProperty("--card-color", card.color);
      button.setAttribute("aria-label", `Carta ${index + 1}`);
      button.addEventListener("click", () => revealCard(index));
      fragment.appendChild(button);
    });

    grid.appendChild(fragment);
  }

  function start() {
    matched = 0;
    moves = 0;
    locked = false;
    started = true;
    revealed = [];
    createGrid();
    primaryAction.textContent = "Reiniciar";
    setMetrics("Pares: ", matched, "Jogadas: ", moves);
    setStatus("Rodada ativa.");
  }

  function stop(message = "Pronto para jogar.") {
    locked = false;
    started = false;
    revealed = [];

    if (currentGame === "memory") {
      primaryAction.textContent = "Iniciar";
      setMetrics("Pares: ", matched, "Jogadas: ", moves);
      setStatus(message);
    }
  }

  function revealCard(index) {
    if (!started) {
      start();
      return;
    }

    if (locked) {
      return;
    }

    const button = grid.children[index];
    if (!button || button.classList.contains("revealed") || button.classList.contains("matched")) {
      return;
    }

    button.classList.add("revealed");
    revealed.push({ index, label: cards[index].label });

    if (revealed.length < 2) {
      return;
    }

    moves += 1;
    setMetrics("Pares: ", matched, "Jogadas: ", moves);

    const [first, second] = revealed;
    if (first.label === second.label) {
      grid.children[first.index].classList.add("matched");
      grid.children[second.index].classList.add("matched");
      revealed = [];
      matched += 1;
      setMetrics("Pares: ", matched, "Jogadas: ", moves);

      if (matched === baseCards.length) {
        setRecord("memory", moves, "low");
        stop(`Jogo completo em ${moves} jogadas.`);
      }
      return;
    }

    locked = true;
    window.setTimeout(() => {
      grid.children[first.index].classList.remove("revealed");
      grid.children[second.index].classList.remove("revealed");
      revealed = [];
      locked = false;
    }, 650);
  }

  function prepare() {
    if (grid.children.length === 0) {
      createGrid();
    }
    setMetrics("Pares: ", matched, "Jogadas: ", moves);
  }

  return { prepare, start, stop };
})();

const dash = (() => {
  const canvas = document.querySelector("#dashCanvas");
  const context = canvas.getContext("2d");
  const controls = Array.from(document.querySelectorAll("[data-move]"));
  const player = { x: 300, y: 360, width: 48, height: 24, speed: 7 };
  const keys = { left: false, right: false };
  let obstacles = [];
  let energy = [];
  let score = 0;
  let lives = 3;
  let frame = 0;
  let animationId = null;
  let running = false;

  function drawBackground() {
    context.fillStyle = "#0f1317";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(63, 212, 224, 0.12)";
    context.lineWidth = 1;

    for (let x = 40; x < canvas.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x - 80, canvas.height);
      context.stroke();
    }
  }

  function drawPlayer() {
    context.fillStyle = "#3fd4e0";
    context.fillRect(player.x, player.y, player.width, player.height);
    context.fillStyle = "#ffd166";
    context.fillRect(player.x + 14, player.y - 10, 20, 10);
  }

  function drawItems() {
    obstacles.forEach((obstacle) => {
      context.fillStyle = "#ff6b6b";
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    energy.forEach((item) => {
      context.fillStyle = "#ffd166";
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawIdle() {
    drawBackground();
    drawPlayer();
    context.fillStyle = "rgba(247, 247, 242, 0.72)";
    context.font = "700 24px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("METEORO DASH", canvas.width / 2, 130);
  }

  function reset() {
    player.x = (canvas.width - player.width) / 2;
    obstacles = [];
    energy = [];
    score = 0;
    lives = 3;
    frame = 0;
    setMetrics("Vidas: ", lives, "Pontos: ", score);
    drawIdle();
  }

  function spawnObstacle() {
    const width = 34 + Math.random() * 36;
    obstacles.push({
      x: Math.random() * (canvas.width - width),
      y: -48,
      width,
      height: 30 + Math.random() * 26,
      speed: 2.5 + Math.random() * 2.7 + score / 900
    });
  }

  function spawnEnergy() {
    energy.push({
      x: 20 + Math.random() * (canvas.width - 40),
      y: -20,
      radius: 11,
      speed: 2.4 + Math.random() * 1.8
    });
  }

  function intersectsRect(a, b) {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  function intersectsCircle(rect, circle) {
    const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    return dx * dx + dy * dy < circle.radius * circle.radius;
  }

  function update() {
    frame += 1;

    if (keys.left) {
      player.x -= player.speed;
    }

    if (keys.right) {
      player.x += player.speed;
    }

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

    if (frame % 34 === 0) {
      spawnObstacle();
    }

    if (frame % 150 === 0) {
      spawnEnergy();
    }

    obstacles.forEach((obstacle) => {
      obstacle.y += obstacle.speed;
    });

    energy.forEach((item) => {
      item.y += item.speed;
    });

    obstacles = obstacles.filter((obstacle) => {
      if (intersectsRect(player, obstacle)) {
        lives -= 1;
        setMetrics("Vidas: ", lives, "Pontos: ", score);
        return false;
      }

      if (obstacle.y > canvas.height) {
        score += 25;
        setRecord("dash", score);
        setMetrics("Vidas: ", lives, "Pontos: ", score);
        return false;
      }

      return true;
    });

    energy = energy.filter((item) => {
      if (intersectsCircle(player, item)) {
        score += 100;
        setRecord("dash", score);
        setMetrics("Vidas: ", lives, "Pontos: ", score);
        return false;
      }

      return item.y <= canvas.height + item.radius;
    });
  }

  function loop() {
    if (!running) {
      return;
    }

    update();
    drawBackground();
    drawItems();
    drawPlayer();

    if (lives <= 0) {
      stop(`Fim de partida. Pontuacao: ${score}.`);
      return;
    }

    animationId = window.requestAnimationFrame(loop);
  }

  function start() {
    stop("");
    reset();
    running = true;
    primaryAction.textContent = "Reiniciar";
    setStatus("Partida ativa.");
    animationId = window.requestAnimationFrame(loop);
  }

  function stop(message = "Pronto para jogar.") {
    running = false;
    window.cancelAnimationFrame(animationId);
    animationId = null;
    keys.left = false;
    keys.right = false;

    if (currentGame === "dash") {
      primaryAction.textContent = "Iniciar";
      setStatus(message);
      drawIdle();
    }
  }

  function prepare() {
    reset();
  }

  window.addEventListener("keydown", (event) => {
    if (currentGame !== "dash") {
      return;
    }

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      keys.left = true;
      event.preventDefault();
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      keys.right = true;
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      keys.left = false;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      keys.right = false;
    }
  });

  controls.forEach((button) => {
    const move = button.dataset.move;
    const setMove = (value) => {
      keys[move] = value;
    };

    button.addEventListener("pointerdown", () => setMove(true));
    button.addEventListener("pointerup", () => setMove(false));
    button.addEventListener("pointerleave", () => setMove(false));
    button.addEventListener("pointercancel", () => setMove(false));
  });

  return { prepare, start, stop };
})();

const games = {
  reflex: {
    title: "Reflexo Turbo",
    action: "Iniciar",
    status: "Pronto para jogar.",
    prepare: reflex.prepare,
    start: reflex.start
  },
  memory: {
    title: "Memoria Pixel",
    action: "Iniciar",
    status: "Pronto para jogar.",
    prepare: memory.prepare,
    start: memory.start
  },
  dash: {
    title: "Meteoro Dash",
    action: "Iniciar",
    status: "Pronto para jogar.",
    prepare: dash.prepare,
    start: dash.start
  }
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => selectGame(button.dataset.game));
});

cardButtons.forEach((button) => {
  button.addEventListener("click", () => selectGame(button.dataset.game));
});

primaryAction.addEventListener("click", () => {
  games[currentGame].start();
});

selectGame("reflex");

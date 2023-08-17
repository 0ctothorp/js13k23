class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    /** How many pixels is a one unit */
    this.zoom = 16;
    /** position of the camera in world units */
    this.position = { x: 0, y: 0 };
  }

  worldToScreen({ x, y }) {
    const screenCoords = {
      x: Math.ceil(x * this.zoom + this.canvas.width / 2),
      y: Math.ceil(y * this.zoom + this.canvas.height / 2),
    };
    return screenCoords;
  }

  isInViewport(position) {
    const screen = this.worldToScreen(position);
    return (
      screen.x >= 0 &&
      screen.x <= this.canvas.innerWidth &&
      screen.y >= 0 &&
      screen.y <= this.canvas.innerHeight
    );
  }
}

function getGameState(canvas) {
  return {
    time: {
      delta: 0,
      prevFrameTime: 0,
    },
    input: new Set(),
    rendering: {
      ctx: canvas.getContext("2d"),
      camera: new Camera(canvas),
    },
    entities: {
      positions: new Map([["player", { x: 0, y: 0 }]]),
      sizes: new Map([["player", { x: 2, y: 2 }]]),
    },
  };
}

function getDeltaTime(gameState, currentFrameTime) {
  if (!gameState.time.prevFrameTime) {
    gameState.time.prevFrameTime = currentFrameTime;
    return 0;
  }

  gameState.time.delta = currentFrameTime - gameState.time.prevFrameTime;
  gameState.time.prevFrameTime = currentFrameTime;
  return gameState.time.delta;
}

/**
 *
 * @param {typeof state} gameState
 * @param {string} key
 * @param {boolean} isPressed
 */
function keyboardInput(gameState, key, isPressed) {
  const { input } = gameState;

  if (isPressed) input.add(key);
  else input.delete(key);
}

function draw(gameState) {
  const { ctx, camera } = gameState.rendering;
  const { positions, sizes } = gameState.entities;
  const unit = camera.zoom;

  for (const [key, p] of positions) {
    ctx.fillStyle = "green";
    const { x, y } = camera.worldToScreen(p);
    const size = sizes.get(key);
    ctx.fillRect(x, y, unit * size.x, unit * size.y);
  }
}

function setup(gameState) {
  window.addEventListener("keydown", (event) => {
    keyboardInput(gameState, event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    keyboardInput(gameState, event.code, false);
  });

  return function gameLoop(frameTime) {
    const deltaTime = getDeltaTime(gameState, frameTime);

    draw(gameState);
    requestAnimationFrame(gameLoop);
  };
}

function startGame() {
  const canvas = document.querySelector("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener(
    "resize",
    debounce(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    })
  );

  const state = getGameState(canvas);
  const gameLoop = setup(state);
  requestAnimationFrame(gameLoop);
}

startGame();

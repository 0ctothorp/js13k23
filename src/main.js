const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function getGameState(canvasCtx) {
  return {
    time: {
      delta: 0,
      prevFrameTime: 0,
    },
    input: new Set(),
    rendering: {
      ctx: canvasCtx,
    },
    logic: {
      positions: new Map(),
      entities: new Set(["player", "enemy1"]),
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

  console.log([...input.values()]);
}

function setup(gameState) {
  window.addEventListener("keydown", (event) => {
    keyboardInput(gameState, event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    keyboardInput(gameState, event.code, false);
  });
}

function draw(gameState) {}

function gameLoop(frameTime) {
  const deltaTime = getDeltaTime(state, frameTime);

  draw();
  requestAnimationFrame(gameLoop);
}

const state = getGameState(ctx);
setup(state);
requestAnimationFrame(gameLoop);

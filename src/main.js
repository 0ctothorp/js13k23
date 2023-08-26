import { debounce } from "./utils.js";
import { WALL_SPRITE_WIDTH } from "./consts.js";
import { Camera } from "./camera.js";

/** @typedef {{x: number; y: number}} NumVec2 */

/** @type {HTMLImageElement} */
const wallSprite = document.querySelector("#sprite-wall");
/** @type {HTMLImageElement} */
const knightSprite = document.querySelector("#sprite-knight");

/**
 * @param {HTMLCanvasElement} canvas
 */
function getGameState(canvas) {
  return {
    time: {
      delta: 0,
      currentFrameTime: 0,
    },
    input: {
      keyboard: new Set(),
      mouse: { x: 0, y: 0 },
      clicks: [],
      mousedown: false,
    },
    rendering: {
      canvas,
      ctx: canvas.getContext("2d"),
      camera: new Camera(canvas),
    },
    entities: {
      positions: new Map([["player", { x: 0, y: 0 }]]),
      // gdyby tak szukać kolizji binary searchem?
      // positionsArraySortedX: [{ entity: "player", x: 0, y: 0 }],
      // positionsArraySortedY: [{ entity: "player", x: 0, y: 0 }],
      positionsSet: new Set(),
      sprites: new Map([
        [
          "player",
          {
            type: "img",
            data: knightSprite,
            size: { x: 8, y: 8 },
          },
        ],
        [
          "wall_",
          {
            type: "img",
            size: { x: 8, y: 8 },
            data: wallSprite,
          },
        ],
      ]),
    },
  };
}

/** @typedef {ReturnType<typeof getGameState>} GameState */

function setTime(gameState, nextFrameTime) {
  if (!gameState.time.currentFrameTime) {
    gameState.time.currentFrameTime = nextFrameTime;
    return 0;
  }

  gameState.time.delta = nextFrameTime - gameState.time.currentFrameTime;
  gameState.time.currentFrameTime = nextFrameTime;
  return gameState.time.delta;
}

/**
 *
 * @param {typeof state} gameState
 * @param {string} key
 * @param {boolean} isPressed
 */
function keyboardInput(gameState, key, isPressed) {
  const { keyboard } = gameState.input;

  if (isPressed) keyboard.add(key);
  else keyboard.delete(key);
}

function drawSprite(sprite, position, gameState) {
  const { rendering } = gameState;
  const { camera, ctx } = rendering;

  const { x, y } = camera.worldToScreen(position);
  const unit = camera.zoom;

  const startx = x;
  const starty = y;

  ctx.drawImage(
    sprite.data,
    0,
    0,
    sprite.data.naturalWidth,
    sprite.data.naturalHeight,
    startx,
    starty,
    sprite.size.x * unit,
    sprite.size.y * unit
  );
}

function getSprite(name, gameState) {
  const { sprites } = gameState.entities;
  let sprite = sprites.get(name);
  if (!sprite) {
    const prefix = name.substring(0, name.indexOf("_") + 1);
    sprite = sprites.get(prefix);
    if (!sprite) {
      throw new Error(`no sprite for ${key}`);
    }
  }
  return sprite;
}

function drawSprites(gameState) {
  const { positions } = gameState.entities;

  for (const [key, position] of positions) {
    const sprite = getSprite(key, gameState);
    drawSprite(sprite, position, gameState);
  }
}

function screenToWorldGrid(position, cellWidth, gameState) {
  const { camera } = gameState.rendering;
  const worldPos = camera.screenToWorld(position);

  const alignedInWorld = {
    x: worldPos.x - (worldPos.x % cellWidth) - (worldPos.x < 0 ? cellWidth : 0), // no idea why i need to do this, but it works ¯\_(ツ)_/¯
    y: worldPos.y - (worldPos.y % cellWidth) + (worldPos.y > 0 ? cellWidth : 0), // no idea why i need to do this, but it works ¯\_(ツ)_/¯
  };

  return alignedInWorld;
}

/**
 * @param {GameState} gameState
 */
function drawWallBuildingSpot(gameState) {
  const { camera, ctx } = gameState.rendering;
  const { mouse } = gameState.input;
  const gridCell = screenToWorldGrid(mouse, camera.gridCellSize, gameState);
  const screenPos = camera.worldToScreen(gridCell);
  ctx.fillStyle = "rgba(100, 200, 200, 0.2)";
  ctx.fillRect(screenPos.x, screenPos.y, WALL_SPRITE_WIDTH, WALL_SPRITE_WIDTH);
  // DEBUG-START
  ctx.fillStyle = "white";
  ctx.font = "12px sans-serif";
  ctx.fillText(`(${gridCell.x}, ${gridCell.y})`, screenPos.x, screenPos.y);
  // DEBUG-END
}

function draw(gameState) {
  const { ctx, canvas } = gameState.rendering;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSprites(gameState);
  // this needs to be last
  drawWallBuildingSpot(gameState);
}

const SPEED = 55;

/**
 * @typedef {{pos: NumVec2; size: NumVec2}} Collider
 * @param {Collider} a
 * @param {Collider} b
 */
function checkAxisAlignedRectanglesCollision(a, b) {
  // Two rectangles A and B DO NOT overlap, when:
  // - A.right < B.left
  // - and A.bottom > B.top
  // in cartesian system
  if (a.pos.x + a.size.x < b.pos.x || a.pos.y - a.size.y > b.pos.y)
    return false;

  // do a check with A and B swapped
  if (b.pos.x + b.size.x < a.pos.x || b.pos.y - b.size.y > a.pos.y)
    return false;

  return true;
}

/**
 * @param {GameState} gameState
 */
function movement(gameState) {
  const { input, entities, time } = gameState;
  const { positions, sprites } = entities;
  const { keyboard } = input;
  let xaxis = keyboard.has("KeyA") ? -1 : keyboard.has("KeyD") ? 1 : 0;
  let yaxis = keyboard.has("KeyW") ? 1 : keyboard.has("KeyS") ? -1 : 0;

  if (!xaxis && !yaxis) return;

  let x = (xaxis * SPEED * time.delta) / 1000,
    y = (yaxis * SPEED * time.delta) / 1000;

  if (x && y) {
    x /= 1.41;
    y /= 1.41;
  }

  const pos = positions.get("player");

  const tmpx = pos.x + x;
  const tmpy = pos.y + y;

  let isCollidingx = false;
  let isCollidingy = false;

  const wallSpriteSize = sprites.get("wall_").size;
  const playerSpriteSize = sprites.get("player").size;

  // check collisions with walls only
  const wallsPositions = [...positions.entries()].filter(([k]) =>
    k.startsWith("wall_")
  );

  for (const [, wallPos] of wallsPositions) {
    isCollidingx ||= checkAxisAlignedRectanglesCollision(
      {
        pos: wallPos,
        size: wallSpriteSize,
      },
      { pos: { x: tmpx, y: pos.y }, size: playerSpriteSize }
    );

    isCollidingy ||= checkAxisAlignedRectanglesCollision(
      {
        pos: wallPos,
        size: wallSpriteSize,
      },
      { pos: { x: pos.x, y: tmpy }, size: playerSpriteSize }
    );

    if (isCollidingx && isCollidingy) break;
  }

  // TEMPORARY
  if (isCollidingx && isCollidingy) {
    return;
  }

  if (isCollidingx) {
    pos.y += y;
    return;
  }

  if (isCollidingy) {
    pos.x += x;
    return;
  }

  pos.x += x;
  pos.y += y;
}

/**
 * @param {GameState} gameState
 */
function attachEventListeners(gameState) {
  const { input, rendering } = gameState;
  const { canvas } = rendering;
  const { mouse, clicks } = input;

  window.addEventListener(
    "resize",
    debounce(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    })
  );

  window.onkeydown = (event) => {
    keyboardInput(gameState, event.code, true);
  };

  window.onkeyup = (event) => {
    keyboardInput(gameState, event.code, false);
  };

  /**
   * @param {MouseEvent} event
   */
  window.onmousemove = (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
  };

  /**
   * @param {MouseEvent} event
   */
  document.onmouseup = (event) => {
    clicks.push({
      x: event.x,
      y: event.y,
      button: event.button,
    });
    input.mousedown = { button: null };
  };

  document.onmousedown = (event) => {
    input.mousedown = { button: event.button };
  };

  document.oncontextmenu = (event) => {
    // TODO: check on other browsers
    event.preventDefault();
  };
}

/**
 *
 * @param {GameState} gameState
 */
function building(gameState) {
  const { input, entities, rendering } = gameState;
  const { positions } = entities;
  const { mousedown } = input;

  // const click = input.clicks.pop();
  // if (!click) return;

  if (mousedown.button === null) return;

  const gridCell = screenToWorldGrid(
    input.mouse,
    rendering.camera.gridCellSize,
    gameState
  );

  const entity = `wall_${gridCell.x.toFixed()}_${gridCell.y.toFixed()}`;

  // left button
  if (mousedown.button === 0 && !positions.has(entity)) {
    positions.set(entity, gridCell);
  }

  // right button
  if (mousedown.button === 2) {
    positions.delete(entity);
  }
}

function setup(gameState) {
  attachEventListeners(gameState);

  gameState.rendering.ctx.imageSmoothingEnabled = false;

  return function gameLoop(frameTime) {
    setTime(gameState, frameTime);

    movement(gameState);
    building(gameState);
    draw(gameState);

    requestAnimationFrame(gameLoop);
  };
}

function startGame() {
  const canvas = document.querySelector("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const state = getGameState(canvas);
  const gameLoop = setup(state);
  requestAnimationFrame(gameLoop);
}

startGame();

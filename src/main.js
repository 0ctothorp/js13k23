import { debounce, vecLen, vecSub, moveTowards, moveAlongDirection } from "./utils.js";
import {
  WALL_SPRITE_WIDTH,
  ENEMY_MOVEMENT_SPEED,
  TOWER_PROJECTILE_SPEED,
  PLAYER_SPEED,
  ENEMY_SPRITE_SIZE,
} from "./consts.js";
import { Camera } from "./camera.js";

/** @type {HTMLImageElement} */
const wallSprite = document.querySelector("#sprite-wall");
/** @type {HTMLImageElement} */
const knightSprite = document.querySelector("#sprite-knight");
/** @type {HTMLImageElement} */
const enemySprite = document.querySelector("#sprite-enemy");

/** @typedef {import("./utils.js").NumVec2} NumVec2 */

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
      positions: new Map([
        ["enemySpawn", { x: 10, y: 0 }],
        ["player", { x: 0, y: 0 }],
        // ["enemy_1", { x: 8 * 10, y: 8 * 9 }],
        ["tower", { x: 0, y: 0 }],
      ]),
      enemyPositions: [
        { x: 80, y: 72 },
        { x: -90, y: -82 },
      ],
      enemySpawns: [
        [-100, 100],
        [100, 100],
        [-100, -100],
        [100, -100],
      ],
      enemyHp: [100, 100],
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
        [
          "enemy_",
          {
            type: "img",
            data: enemySprite,
            size: { x: 8, y: 8 },
          },
        ],
        [
          "tower",
          {
            type: "img",
            data: document.querySelector("#sprite-tower"),
            size: { x: 32, y: 32 },
          },
        ],
      ]),
      projectiles: {
        lastShotAt: null,
        /** @type {{pos: NumVec2; direction: NumVec2[]; active: boolean}[]} */
        positions: [],
      },
      // TODO: implement tower collider
      // [x, y, w, h]
      invisibleWalls: [
        [-8, -8, 16, 8],
        [8, 8, 8, 16],
        [-8, 16, 16, 8],
        [-16, 8, 8, 16],
      ],
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

  const { x, y } = camera.worldToScreen({
    x: position.x - sprite.size.x / 2,
    y: position.y + sprite.size.y / 2,
  });
  const unit = camera.zoom;

  ctx.drawImage(
    sprite.data,
    0,
    0,
    sprite.data.naturalWidth,
    sprite.data.naturalHeight,
    x,
    y,
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
  }
  return sprite;
}

function drawSprites(gameState) {
  const { positions } = gameState.entities;

  for (const [key, position] of positions) {
    const sprite = getSprite(key, gameState);
    if (!sprite) continue;
    drawSprite(sprite, position, gameState);
  }
}

/**
 * @param {GameState} gameState
 */
function drawEnemies(gameState) {
  const { enemyPositions } = gameState.entities;

  for (const position of enemyPositions) {
    const sprite = getSprite("enemy_", gameState);
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

/**
 * @typedef {{pos: import("./utils.js").NumVec2; size: import("./utils.js").NumVec2}} Collider
 * @param {Collider} a
 * @param {Collider} b
 */
function checkAxisAlignedRectanglesCollision(a, b) {
  // Two rectangles A and B DO NOT overlap, when:
  // - A.right < B.left
  // - and A.bottom > B.top
  // in cartesian system
  if (a.pos.x + a.size.x < b.pos.x || a.pos.y - a.size.y > b.pos.y) return false;

  // do a check with A and B swapped
  if (b.pos.x + b.size.x < a.pos.x || b.pos.y - b.size.y > a.pos.y) return false;

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

  let x = xaxis * PLAYER_SPEED * time.delta,
    y = yaxis * PLAYER_SPEED * time.delta;

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
  const wallsPositions = [...positions.entries()].filter(([k]) => k.startsWith("wall_"));

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
function enemyMovement(gameState) {
  const { enemyPositions } = gameState.entities;
  const { delta } = gameState.time;

  for (const p of enemyPositions) {
    let target = { x: 0, y: 0 };
    const playerPos = gameState.entities.positions.get("player");
    const playerDist = vecLen(vecSub(playerPos, p));
    if (playerDist < 50) target = playerPos;

    moveTowards(p, target, ENEMY_MOVEMENT_SPEED * delta);
  }
}

/**
 * @param {GameState} gameState
 */
function shootTowerProjectile(gameState) {
  const { projectiles, enemyPositions } = gameState.entities;
  projectiles.lastShotAt = gameState.time.currentFrameTime;

  const towerPos = { x: 0, y: 0 };
  let closestEnemy;
  for (const p of enemyPositions) {
    const dist = vecLen(vecSub(p, towerPos));
    if (!closestEnemy) {
      closestEnemy = { p, dist };
      continue;
    }
    if (dist < closestEnemy.dist) {
      closestEnemy = { p, dist };
    }
  }

  const inactive = projectiles.positions.filter((x) => !x.active);

  if (inactive.length) {
    const projectile = inactive[0];
    projectile.pos.x = 0;
    projectile.pos.y = 0;
    projectile.active = true;
    projectile.direction.x = closestEnemy.p.x;
    projectile.direction.y = closestEnemy.p.y;
  } else {
    projectiles.positions.push({
      active: true,
      pos: { x: 0, y: 0 },
      direction: { x: closestEnemy.p.x, y: closestEnemy.p.y },
    });
  }

  console.log({ projectiles: projectiles.positions });
}

/**
 * @param {GameState} gameState
 */
function updateTowerProjectiles(gameState) {
  const { projectiles } = gameState.entities;
  for (const p of projectiles.positions.filter((x) => x.active)) {
    moveAlongDirection(p.pos, p.direction, TOWER_PROJECTILE_SPEED * gameState.time.delta);
    if (!gameState.rendering.camera.isInViewport(p.pos)) {
      p.active = false;
    }
  }
}

/**
 * @param {GameState} gameState
 */
function tower(gameState) {
  const { projectiles } = gameState.entities;

  if (!projectiles.lastShotAt) {
    shootTowerProjectile(gameState);
    return;
  }

  if (projectiles.lastShotAt + 3000 < gameState.time.currentFrameTime) {
    shootTowerProjectile(gameState);
  }

  updateTowerProjectiles(gameState);
}

const PROJECTILE_HIT_BOX_SIZE = 2;

/**
 * @param {GameState} gameState
 */
function drawTowerProjectiles(gameState) {
  const { ctx, camera } = gameState.rendering;
  const { positions } = gameState.entities.projectiles;
  ctx.fillStyle = "yellow";

  const wsize = PROJECTILE_HIT_BOX_SIZE;
  const ssize = wsize * camera.zoom;

  const onlyActive = positions.filter((x) => x.active);

  for (const p of onlyActive) {
    const spos = camera.worldToScreen(p.pos);

    // TODO: draw an arrow sprite
    ctx.beginPath();
    ctx.ellipse(spos.x + wsize / 2, spos.y + wsize / 2, ssize, ssize, 0, 0, 2 * Math.PI);
    ctx.fill();
  }
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

  const gridCell = screenToWorldGrid(input.mouse, rendering.camera.gridCellSize, gameState);

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

/**
 * @param {GameState} gameState
 */
function checkProjectileCollisions(gameState) {
  const { projectiles, enemyPositions, enemyHp } = gameState.entities;

  const projCollider = {
    pos: null,
    size: { x: PROJECTILE_HIT_BOX_SIZE, y: PROJECTILE_HIT_BOX_SIZE },
  };

  const enemyCollider = {
    pos: null,
    size: { x: ENEMY_SPRITE_SIZE, y: ENEMY_SPRITE_SIZE },
  };

  for (const proj of projectiles.positions.filter((x) => x.active)) {
    projCollider.pos = proj.pos;
    // I'm curious how's for(const [k, v] of array.entries()) performance wise against for(let i = 0...)
    for (let i = 0; i < enemyPositions.length; i++) {
      const enemyPos = enemyPositions[i];
      enemyCollider.pos = enemyPos;
      const areColliding = checkAxisAlignedRectanglesCollision(projCollider, enemyCollider);

      if (!areColliding) continue;

      enemyHp[i] -= 50;
      proj.active = false;

      // document.querySelector("#debug-window .enemies-hp").innerHTML = enemyHp.toString();
    }
  }
}

function draw(gameState) {
  const { ctx, canvas } = gameState.rendering;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSprites(gameState);
  drawEnemies(gameState);
  drawTowerProjectiles(gameState);
  // this needs to be last
  drawWallBuildingSpot(gameState);

  // show center of the screen
  // {
  //   ctx.fillStyle = "red";
  //   ctx.fillRect(window.innerWidth / 2 - 5, window.innerHeight / 2 - 5, 10, 10);
  // }
}

function setup(gameState) {
  attachEventListeners(gameState);

  gameState.rendering.ctx.imageSmoothingEnabled = false;

  return function gameLoop(frameTime) {
    setTime(gameState, frameTime);

    movement(gameState);
    enemyMovement(gameState);

    building(gameState);

    tower(gameState);
    checkProjectileCollisions(gameState);

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

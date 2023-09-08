import { debounce, vecLen, vecSub, moveAlongDirection, Vec2, Collider } from "./utils.js";
import {
  WALL_SPRITE_WIDTH_PX,
  TOWER_PROJECTILE_SPEED,
  PLAYER_SPEED,
  ENEMY_SPRITE_SIZE,
  TOWER_PROJECTILE_DAMAGE,
} from "./consts.js";
import Enemies from "./enemies/enemies.js";
import EnemySpawns from "./enemies/enemySpawns.js";
import { getGameState } from "./gameState.js";
import { drawSprites } from "./sprites.js";
import { checkAxisAlignedRectanglesCollision } from "./collisions.js";
import Tower from "./tower.js";
import debug from "./debug.js";

/** @typedef {import("./gameState.js").GameState} GameState */

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

/**
 * @param {Vec2} position
 * @param {number} cellWidth
 * @param {GameState} gameState
 */
function screenToWorldGrid(position, cellWidth, gameState) {
  const { camera } = gameState.rendering;
  const worldPos = camera.screenToWorld(position);

  const gridAligned = new Vec2(
    worldPos.x - (worldPos.x % cellWidth) - (worldPos.x < 0 ? cellWidth : 0), // no idea why i need to do this, but it works ¯\_(ツ)_/¯
    worldPos.y - (worldPos.y % cellWidth) + (worldPos.y > 0 ? cellWidth : 0) // no idea why i need to do this, but it works ¯\_(ツ)_/¯
  );

  return gridAligned;
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
  ctx.fillRect(screenPos.x, screenPos.y, WALL_SPRITE_WIDTH_PX, WALL_SPRITE_WIDTH_PX);
  // DEBUG-START
  ctx.fillStyle = "white";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `(${gridCell.x + camera.gridCellSize / 2}, ${gridCell.y - camera.gridCellSize / 2})`,
    screenPos.x,
    screenPos.y
  );
  // DEBUG-END
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

  const posCenter = positions.get("player");

  const tmpx = posCenter.x + x;
  const tmpy = posCenter.y + y;

  let isCollidingx = false;
  let isCollidingy = false;

  const wallSpriteSize = sprites.get("wall_").size;
  /** @type {Vec2} */
  const playerSpriteSize = sprites.get("player").size;
  const psizeHalf = playerSpriteSize.x / 2;

  // check collisions with walls only
  // TODO: create a collider together with a wall, so we're not allocating new memory for colliders every time a player
  // moves and there are walls on the map
  const colliders = [...positions.entries()]
    .filter(([k]) => k.startsWith("wall_"))
    .map(([, v]) => new Collider(v.x, v.y, wallSpriteSize.x, wallSpriteSize.y));
  colliders.push(gameState.colliders["tower-down"]);

  const pcollider = new Collider(tmpx - psizeHalf, posCenter.y + psizeHalf, playerSpriteSize.x, playerSpriteSize.y);
  for (const collider of colliders) {
    isCollidingx ||= checkAxisAlignedRectanglesCollision(collider, pcollider);

    pcollider.pos.x = posCenter.x - psizeHalf;
    pcollider.pos.y = tmpy + psizeHalf;
    isCollidingy ||= checkAxisAlignedRectanglesCollision(collider, pcollider);

    if (isCollidingx && isCollidingy) break;
  }

  // TEMPORARY ???
  if (isCollidingx && isCollidingy) return;

  if (isCollidingx) {
    posCenter.y += y;
    return;
  }

  if (isCollidingy) {
    posCenter.x += x;
    return;
  }

  posCenter.x += x;
  posCenter.y += y;
}

/**
 * @param {GameState} gameState
 */
function shootTowerProjectile(gameState) {
  const { projectiles } = gameState.entities;
  projectiles.lastShotAt = gameState.time.currentFrameTime;

  const towerPos = { x: 0, y: 0 };
  const aliveEnemies = Enemies.getAliveItems(gameState).positions;
  let closestEnemy;
  for (const p of aliveEnemies) {
    const dist = vecLen(vecSub(p, towerPos));
    if (!closestEnemy) {
      closestEnemy = { p, dist };
      continue;
    }
    if (dist < closestEnemy.dist) {
      closestEnemy = { p, dist };
    }
  }

  if (!closestEnemy) return;

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

  if (projectiles.lastShotAt + 2000 < gameState.time.currentFrameTime) {
    shootTowerProjectile(gameState);
  }

  Tower.towerTriggerCollisions(gameState);
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

  if (mousedown.button === null) return;

  const gridCell = screenToWorldGrid(input.mouse, rendering.camera.gridCellSize, gameState);
  gridCell.x += rendering.camera.gridCellSize / 2;
  gridCell.y -= rendering.camera.gridCellSize / 2;

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
  const { projectiles, enemies } = gameState.entities;

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
    for (let i = 0; i < enemies.positions.length; i++) {
      const enemyPos = enemies.positions[i];
      enemyCollider.pos = enemyPos;
      const areColliding = checkAxisAlignedRectanglesCollision(projCollider, enemyCollider);

      if (!areColliding) continue;

      enemies.hps[i] -= TOWER_PROJECTILE_DAMAGE;
      proj.active = false;

      // document.querySelector("#debug-window .enemies-hp").innerHTML = enemies.hps.toString();
    }
  }
}

function draw(gameState) {
  const { ctx, canvas } = gameState.rendering;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  Enemies.draw(gameState);
  drawSprites(gameState);
  drawTowerProjectiles(gameState);
  // this needs to be last
  drawWallBuildingSpot(gameState);

  // debug.drawColliders(gameState);

  // show center of the screen
  // {
  //   ctx.fillStyle = "red";
  //   ctx.fillRect(window.innerWidth / 2 - 5, window.innerHeight / 2 - 5, 10, 10);
  // }
}

/**
 * @param {import("./gameState.js").GameState} gameState
 */
function setup(gameState) {
  attachEventListeners(gameState);

  gameState.rendering.ctx.imageSmoothingEnabled = false;

  gameState.entities.enemies.spawns.forEach((s) => {
    s.active = true;
  });

  const observeEnemiesPool = debug.getOserveEnemyPool(gameState);

  return function gameLoop(frameTime) {
    setTime(gameState, frameTime);

    movement(gameState);

    Enemies.update(gameState);
    EnemySpawns.update(gameState);

    building(gameState);

    tower(gameState);
    checkProjectileCollisions(gameState);

    draw(gameState);

    // debug
    observeEnemiesPool();

    // debug
    // {
    //   const {
    //     rendering: { ctx, camera },
    //     entities: { tower },
    //     triggers,
    //   } = gameState;

    //   const col = triggers["upper-tower"].collider;
    //   const towerScr = camera.worldToScreen({
    //     x: col.pos.x,
    //     y: col.pos.y,
    //   });
    //   ctx.strokeStyle = "red";
    //   ctx.strokeRect(towerScr.x, towerScr.y, col.size.x * camera.zoom, col.size.y * camera.zoom);
    // }

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

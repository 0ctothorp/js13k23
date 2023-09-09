import { debounce, Vec2 } from "./utils.js";
import { WALL_SPRITE_WIDTH_PX } from "./consts.js";
import Enemies from "./enemies/enemies.js";
import EnemySpawns from "./enemies/enemySpawns.js";
import { getGameState } from "./gameState.js";
import debug from "./debug.js";
import player from "./player.js";
import tower from "./tower.js";
import slash from "./slash.js";

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
 * @param {GameState} gameState
 * @param {string} key
 * @param {boolean} isPressed
 */
function keyboardInput(gameState, key, isPressed) {
  const { currentlyPressed } = gameState.input;

  if (isPressed) currentlyPressed.add(key);
  else currentlyPressed.delete(key);
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

function draw(gameState) {
  const { ctx, canvas } = gameState.rendering;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  Enemies.draw(gameState);
  tower.draw(gameState);
  player.draw(gameState);

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

    player.update(gameState);

    Enemies.update(gameState);
    EnemySpawns.update(gameState);
    tower.update(gameState);
    slash.update(gameState);

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

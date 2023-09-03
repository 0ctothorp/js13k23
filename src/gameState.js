import { Camera } from "./camera.js";
import { EnemiesData } from "./enemies.js";

/** @typedef {import("./utils.js").NumVec2} NumVec2 */

/** @type {HTMLImageElement} */
const wallSprite = document.querySelector("#sprite-wall");
/** @type {HTMLImageElement} */
const knightSprite = document.querySelector("#sprite-knight");
/** @type {HTMLImageElement} */
const enemySprite = document.querySelector("#sprite-enemy");

/**
 * @param {HTMLCanvasElement} canvas
 */
export function getGameState(canvas) {
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
        ["player", { x: 0, y: 0 }],
        ["tower", { x: 0, y: 0 }],
      ]),
      enemies: new EnemiesData({
        positions: [
          { x: 80, y: 72 },
          { x: -90, y: -82 },
        ],
        spawns: [
          [-100, 100],
          [100, 100],
          [-100, -100],
          [100, -100],
        ],
      }),
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

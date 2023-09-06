import { Camera } from "./camera.js";
import { EnemiesData } from "./enemies/enemies.js";
import { Collider } from "./utils.js";

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
        ["player", { x: 20, y: 20 }],
        ["tower-down", { x: 0, y: -12 }],
        ["tower-up", { x: 0, y: 12 }],
      ]),
      enemies: new EnemiesData({
        positions: [
          { x: 80, y: 72 },
          { x: -90, y: -82 },
        ],
        spawns: [
          { x: -100, y: 100 },
          { x: 100, y: 100 },
          { x: -100, y: -100 },
          { x: 100, y: -100 },
        ],
      }),
      sprites: new Map([
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
          "tower-down",
          {
            type: "img",
            data: document.querySelector("#sprite-tower-down"),
            size: { x: 32, y: 24 },
          },
        ],
        [
          "tower-up",
          {
            type: "img",
            data: document.querySelector("#sprite-tower-up"),
            size: { x: 32, y: 24 },
          },
        ],
        [
          "player",
          {
            type: "img",
            data: knightSprite,
            size: { x: 8, y: 8 },
          },
        ],
      ]),
      projectiles: {
        lastShotAt: null,
        /** @type {{pos: NumVec2; direction: NumVec2[]; active: boolean}[]} */
        positions: [],
      },
    },
    colliders: {
      ["tower-down"]: new Collider(-16, 0, 32, 24),
    },
    triggers: {
      "upper-tower": {
        collider: new Collider(-16, 24, 32, 24),
      },
    },
  };
}

/** @typedef {ReturnType<typeof getGameState>} GameState */

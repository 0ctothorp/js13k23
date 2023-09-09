import { Camera } from "./camera.js";
import { ENEMY_SPRITE_SIZE } from "./consts.js";
import { EnemiesData } from "./enemies/enemies.js";
import { Collider, Vec2 } from "./utils.js";

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
      currentlyPressed: new Set(),
      /** @type {Map<string, {time: number}>} */
      wasPressedAt: new Map(),
      mouse: { x: 0, y: 0 },
      clicks: [],
      /** @type {{button: number | null}} */
      mousedown: { button: null },
    },
    rendering: {
      canvas,
      ctx: canvas.getContext("2d"),
      camera: new Camera(canvas),
    },
    entities: {
      positions: new Map([
        ["player", new Vec2(20, 20)],
        ["tower-down", new Vec2(0, -12)],
        ["tower-up", new Vec2(0, 12)],
      ]),
      enemies: new EnemiesData({
        spawns: [
          { x: -100, y: 100 },
          { x: 100, y: 100 },
          { x: -100, y: -100 },
          { x: 100, y: -100 },
        ],
      }),
      directions: new Map([["player", new Vec2(0, 0)]]),
      /** @type {Map<string, { startedAt: number; direction: Vec2; position: Vec2 }>} */
      performingAttack: new Map(),
      sprites: new Map([
        [
          "wall_",
          {
            size: { x: 8, y: 8 },
            data: wallSprite,
          },
        ],
        [
          "enemy_",
          {
            data: enemySprite,
            size: { x: ENEMY_SPRITE_SIZE, y: ENEMY_SPRITE_SIZE },
          },
        ],
        [
          "tower-down",
          {
            data: document.querySelector("#sprite-tower-down"),
            size: { x: 32, y: 24 },
          },
        ],
        [
          "tower-up",
          {
            data: document.querySelector("#sprite-tower-up"),
            size: { x: 32, y: 24 },
          },
        ],
        [
          "player",
          {
            data: knightSprite,
            size: { x: ENEMY_SPRITE_SIZE, y: ENEMY_SPRITE_SIZE },
          },
        ],
        [
          "slash",
          {
            data: document.querySelector("#sprite-slash"),
            size: { x: ENEMY_SPRITE_SIZE, y: ENEMY_SPRITE_SIZE },
          },
        ],
      ]),
      projectiles: {
        lastShotAt: null,
        /** @type {{pos: Vec2; direction: Vec2[]; active: boolean}[]} */
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

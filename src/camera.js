import { WALL_SPRITE_WIDTH } from "./consts.js";

export class Camera {
  constructor(canvas, zoom = 4) {
    this.canvas = canvas;
    /** How many pixels is a one unit */
    this.zoom = zoom;
    /** position of the camera in world units */
    this.position = { x: 0, y: 0 };
  }

  get gridCellSize() {
    return WALL_SPRITE_WIDTH / this.zoom;
  }

  worldToScreen({ x, y }) {
    const screenCoords = {
      x: Math.ceil(x * this.zoom + this.canvas.width / 2),
      y: Math.ceil(-y * this.zoom + this.canvas.height / 2),
    };
    return screenCoords;
  }

  screenToWorld({ x, y }) {
    const world = {
      x: this.position.x + (x - this.canvas.width / 2) / this.zoom,
      y: this.position.y - (y - this.canvas.height / 2) / this.zoom,
    };
    return world;
  }

  isInViewport(position) {
    const screen = this.worldToScreen(position);
    return screen.x >= 0 && screen.x <= this.canvas.width && screen.y >= 0 && screen.y <= this.canvas.height;
  }
}

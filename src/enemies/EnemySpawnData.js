import { Vec2 } from "../utils";

export class EnemySpawnData {
  lastSpawnAt = undefined;
  active = false;
  interval = Math.random() * 1000 + 2000;

  constructor(x, y) {
    this.position = new Vec2(x, y);
  }
}

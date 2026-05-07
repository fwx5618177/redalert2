import { Timer } from '@ra2/game/gameobject/unit/Timer';
import { NotifyTick } from './interface/NotifyTick';
import { GameObject } from '@ra2/game/gameobject/GameObject';
import { World } from '@ra2/game/World';
export class InvulnerableTrait {
    private timer: Timer;
    constructor() {
        this.timer = new Timer();
    }
    isActive(): boolean {
        return this.timer.isActive();
    }
    setActiveFor(duration: number, world: World): void {
        this.timer.setActiveFor(duration, world as any);
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        this.timer.tick(world.currentTick);
    }
}

import { GameObject } from '@ra2/game/gameobject/GameObject';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class EvictOccupiersExecutor extends TriggerExecutor {
    execute(game: any, targets: GameObject[]): void {
        for (const target of targets) {
            if (target instanceof GameObject &&
                target.isBuilding() &&
                target.garrisonTrait &&
                !target.isDestroyed) {
                target.garrisonTrait.evacuate(game);
            }
        }
    }
}

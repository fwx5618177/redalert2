import { GameObject } from '@ra2/game/gameobject/GameObject';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class SellBuildingExecutor extends TriggerExecutor {
    execute(trigger: any, targets: GameObject[]): void {
        for (const target of targets) {
            if (target instanceof GameObject &&
                target.isBuilding() &&
                !target.isDestroyed) {
                trigger.sellTrait.sell(target);
            }
        }
    }
}

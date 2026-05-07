import { Building, BuildStatus } from "@ra2/game/gameobject/Building";
import { LocomotorType } from "@ra2/game/type/LocomotorType";
import { MovementZone } from "@ra2/game/type/MovementZone";
import { UnitRecycleEvent } from "@ra2/game/event/UnitRecycleEvent";
import { EnterBuildingTask } from "@ra2/game/gameobject/task/EnterBuildingTask";
export class EnterRecyclerTask extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return (e.rules.movementZone !== MovementZone.Fly &&
            e.rules.locomotor !== LocomotorType.Chrono &&
            !e.rules.engineer &&
            this.game.sellTrait.computeRefundValue(e) > 0 &&
            ((e.isInfantry() && this.target.rules.cloning) ||
                this.target.rules.grinding) &&
            !this.target.isDestroyed &&
            this.target.buildStatus === BuildStatus.Ready &&
            e.owner === this.target.owner);
    }
    onEnter(e: any): void {
        this.game.sellTrait.sell(e);
        this.game.events.dispatch(new UnitRecycleEvent(e));
    }
}

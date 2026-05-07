import { EventType } from "@ra2/game/event/EventType";
import { TriggerCondition } from "@ra2/game/trigger/TriggerCondition";
export class PickupCrateCondition extends TriggerCondition {
    check(e: any, t: any[]) {
        return t
            .filter((e) => e.type === EventType.CratePickup &&
            this.targets.includes(e.source))
            .map((e) => e.source);
    }
}

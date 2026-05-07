import { EventType } from "@ra2/game/event/EventType";
import { TriggerCondition } from "@ra2/game/trigger/TriggerCondition";
export class DestroyedOrCapturedCondition extends TriggerCondition {
    check(events: any[], targets: any[]) {
        return targets
            .filter((event) => {
            if (event.type !== EventType.ObjectDestroy &&
                event.type !== EventType.ObjectOwnerChange) {
                return false;
            }
            const target = event.target;
            return !(!target.isTechno() || !this.targets.includes(target));
        })
            .map((event) => event.target);
    }
}

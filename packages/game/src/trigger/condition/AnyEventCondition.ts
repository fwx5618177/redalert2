import { TriggerCondition } from "@ra2/game/trigger/TriggerCondition";
export class AnyEventCondition extends TriggerCondition {
    check(event: any): boolean {
        return true;
    }
}

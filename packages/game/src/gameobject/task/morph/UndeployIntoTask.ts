import { MorphIntoTask } from "@ra2/game/gameobject/task/morph/MorphIntoTask";
import { ObjectType } from "@ra2/engine/type/ObjectType";
export class UndeployIntoTask extends MorphIntoTask {
    onStart(unit: any): void {
        const undeploysInto = unit.rules.undeploysInto;
        if (!undeploysInto) {
            throw new Error(`Object type "${unit.name}" doesn't undeploy into anything`);
        }
        this.morphInto = this.game.rules.getObject(undeploysInto, ObjectType.Vehicle);
        super.onStart(unit);
    }
}

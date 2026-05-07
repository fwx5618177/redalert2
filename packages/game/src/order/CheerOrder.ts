import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@ra2/engine/type/PointerType";
import { CheerTask } from "@ra2/game/gameobject/task/CheerTask";
import { StanceType } from "@ra2/game/gameobject/infantry/StanceType";
export class CheerOrder extends Order {
    constructor() {
        super(OrderType.Cheer);
        this.getPointerType = () => PointerType.NoAction;
    }
    isValid(): boolean {
        return (this.sourceObject.isInfantry() &&
            [StanceType.None, StanceType.Guard].includes(this.sourceObject.stance));
    }
    isAllowed(): boolean {
        return true;
    }
    process(): CheerTask[] {
        return [new CheerTask()];
    }
}

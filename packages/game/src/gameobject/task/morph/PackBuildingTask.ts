import { Task } from "@ra2/game/gameobject/task/system/Task";
import { Building, BuildStatus } from "@ra2/game/gameobject/Building";
import { WaitMinutesTask } from "@ra2/game/gameobject/task/system/WaitMinutesTask";
export class PackBuildingTask extends Task {
    private game: any;
    constructor(game: any) {
        super();
        this.game = game;
    }
    onTick(unit: any): boolean {
        if (unit.buildStatus !== BuildStatus.BuildDown && !unit.rules.wall) {
            unit.setBuildStatus(BuildStatus.BuildDown, this.game);
            this.children.push(new WaitMinutesTask(this.game.rules.general.buildupTime));
            return false;
        }
        return true;
    }
}

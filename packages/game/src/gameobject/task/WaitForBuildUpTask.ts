import { Building, BuildStatus } from "@ra2/game/gameobject/Building";
import { CallbackTask } from "@ra2/game/gameobject/task/system/CallbackTask";
import { TaskGroup } from "@ra2/game/gameobject/task/system/TaskGroup";
import { WaitMinutesTask } from "@ra2/game/gameobject/task/system/WaitMinutesTask";
export class WaitForBuildUpTask extends TaskGroup {
    public cancellable: boolean = false;
    constructor(buildTime: number, game: any) {
        super(new WaitMinutesTask(buildTime), new CallbackTask((building) => {
            building.setBuildStatus(BuildStatus.Ready, game);
        }));
    }
}

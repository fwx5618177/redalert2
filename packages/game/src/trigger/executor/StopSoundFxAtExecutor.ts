import { TriggerStopSoundFxEvent } from '@ra2/game/event/TriggerStopSoundFxEvent';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class StopSoundFxAtExecutor extends TriggerExecutor {
    execute(context: any) {
        const waypoint = this.action.params[6];
        const tile = context.map.getTileAtWaypoint(waypoint);
        if (tile) {
            context.events.dispatch(new TriggerStopSoundFxEvent(tile));
        }
        else {
            console.warn(`No valid location found for waypoint ${waypoint}. ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}

import { TriggerSoundFxEvent } from '@ra2/game/event/TriggerSoundFxEvent';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class PlaySoundFxAtExecutor extends TriggerExecutor {
    execute(game: Game): void {
        const soundIndex = this.action.params[1];
        const waypoint = this.action.params[6];
        const tile = game.map.getTileAtWaypoint(waypoint);
        if (tile) {
            game.events.dispatch(new TriggerSoundFxEvent(soundIndex, tile));
        }
        else {
            console.warn(`No valid location found for waypoint ${waypoint}. ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}

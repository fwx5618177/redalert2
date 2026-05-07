import { TriggerSoundFxEvent } from '@ra2/game/event/TriggerSoundFxEvent';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class PlaySoundFxExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.events.dispatch(new TriggerSoundFxEvent(this.action.params[1]));
    }
}

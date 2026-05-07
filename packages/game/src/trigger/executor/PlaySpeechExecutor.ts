import { TriggerEvaEvent } from '@ra2/game/event/TriggerEvaEvent';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class PlaySpeechExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.events.dispatch(new TriggerEvaEvent(this.action.params[1]));
    }
}

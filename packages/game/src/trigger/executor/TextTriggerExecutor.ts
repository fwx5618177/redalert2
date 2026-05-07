import { TriggerTextEvent } from '@ra2/game/event/TriggerTextEvent';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class TextTriggerExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.events.dispatch(new TriggerTextEvent(this.action.params[1]));
    }
}

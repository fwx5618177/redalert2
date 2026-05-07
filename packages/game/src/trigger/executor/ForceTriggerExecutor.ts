import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class ForceTriggerExecutor extends TriggerExecutor {
    execute(context: any): void {
        const triggerId = this.action.params[1];
        context.triggers.forceTrigger(triggerId, context);
    }
}

import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class DestroyTagExecutor extends TriggerExecutor {
    execute(context: any): void {
        const tagId = this.action.params[1];
        context.triggers.destroyTag(tagId);
    }
}

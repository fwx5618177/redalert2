import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class ForceEndExecutor extends TriggerExecutor {
    execute(trigger: any): void {
        trigger.end();
    }
}

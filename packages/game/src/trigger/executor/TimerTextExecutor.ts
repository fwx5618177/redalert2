import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class TimerTextExecutor extends TriggerExecutor {
    execute(e: any) {
        e.countdownTimer.text = this.action.params[1];
    }
}

import { Game } from '@ra2/game/Game';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class ReshroudMapExecutor extends TriggerExecutor {
    execute(game: Game): void {
        for (const combatant of game.getCombatants()) {
            game.mapShroudTrait.resetShroud(combatant, game);
        }
    }
}

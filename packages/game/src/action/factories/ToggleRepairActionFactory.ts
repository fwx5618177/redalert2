import { ToggleRepairAction } from '../ToggleRepairAction';
import { Game } from '@ra2/game/Game';
export class ToggleRepairActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): ToggleRepairAction {
        return new ToggleRepairAction(this.game);
    }
}

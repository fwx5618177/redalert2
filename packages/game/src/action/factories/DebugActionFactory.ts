import { DebugAction } from '../DebugAction';
import { Game } from '@ra2/game/Game';
export class DebugActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): DebugAction {
        return new DebugAction(this.game);
    }
}

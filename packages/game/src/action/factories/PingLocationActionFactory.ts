import { PingLocationAction } from '../PingLocationAction';
import { Game } from '@ra2/game/Game';
export class PingLocationActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): PingLocationAction {
        return new PingLocationAction(this.game);
    }
}

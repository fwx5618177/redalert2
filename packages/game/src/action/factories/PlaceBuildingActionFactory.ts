import { PlaceBuildingAction } from '../PlaceBuildingAction';
import { Game } from '@ra2/game/Game';
export class PlaceBuildingActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): PlaceBuildingAction {
        return new PlaceBuildingAction(this.game);
    }
}

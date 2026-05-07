import { OrderUnitsAction } from '../OrderUnitsAction';
import { OrderFactory } from '@ra2/game/order/OrderFactory';
import { Game } from '@ra2/game/Game';
import { OrderActionContext } from '@ra2/game/action/OrderActionContext';
export class OrderUnitsActionFactory {
    private game: Game;
    private map: Map<any, any>;
    private orderActionContext: OrderActionContext;
    constructor(game: Game, map: Map<any, any>, orderActionContext: OrderActionContext) {
        this.game = game;
        this.map = map;
        this.orderActionContext = orderActionContext;
    }
    create(): OrderUnitsAction {
        return new OrderUnitsAction(this.game, this.map, this.orderActionContext, new OrderFactory(this.game, this.map));
    }
}

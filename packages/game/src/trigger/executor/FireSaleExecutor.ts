import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
import { Game } from '@ra2/game/Game';
import { Player } from '@ra2/game/Player';
import { Building } from '@ra2/game/Building';
export class FireSaleExecutor extends TriggerExecutor {
    private readonly houseId: number;
    constructor(params: string[], game: Game) {
        super(params, game);
        this.houseId = Number(params[1]);
    }
    execute(game: Game): void {
        const targetPlayer = game.getAllPlayers().find((player: Player) => player.country?.id === this.houseId as any);
        if (targetPlayer) {
            for (const building of targetPlayer.buildings) {
                game.sellTrait.sell(building);
            }
        }
    }
}

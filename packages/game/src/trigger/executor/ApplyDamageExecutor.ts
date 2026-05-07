import { Coords } from '@ra2/util/Coords';
import { CollisionType } from '@ra2/game/gameobject/unit/CollisionType';
import { Warhead } from '@ra2/game/Warhead';
import { TriggerExecutor } from '@ra2/game/trigger/TriggerExecutor';
export class ApplyDamageExecutor extends TriggerExecutor {
    private damage: number;
    constructor(action: any, trigger: any, damage: number) {
        super(action, trigger);
        this.damage = damage;
    }
    execute(context: any): void {
        const waypoint = Number(this.action.params[1]);
        const tile = context.map.getTileAtWaypoint(waypoint);
        if (tile) {
            const warheadRule = context.rules.getWarhead(Warhead.HE_WARHEAD_NAME);
            const warhead = new Warhead(warheadRule);
            const bridge = context.map.tileOccupation.getBridgeOnTile(tile);
            const elevation = bridge?.tileElevation ?? 0;
            const zone = context.map.getTileZone(tile);
            warhead.detonate(context, this.damage, tile, elevation, Coords.tile3dToWorld(tile.rx + 0.5, tile.ry + 0.5, tile.z + elevation), zone, bridge ? CollisionType.OnBridge : CollisionType.None, context.createTarget(bridge, tile), undefined, false, undefined, undefined);
        }
        else {
            console.warn(`No valid location found for waypoint ${waypoint}. ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}

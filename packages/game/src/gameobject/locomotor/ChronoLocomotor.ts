import { Vector2 } from '@ra2/util/math/Vector2';
import { Vector3 } from '@ra2/util/math/Vector3';
import { GameObject } from '@ra2/game/gameobject/GameObject';
import { Game } from '@ra2/game/Game';
export class ChronoLocomotor {
    private game: Game;
    private ignoresTerrain: boolean;
    private distanceToWaypoint: Vector2;
    constructor(game: Game) {
        this.game = game;
        this.ignoresTerrain = true;
        this.distanceToWaypoint = new Vector2();
    }
    onNewWaypoint(unit: GameObject, waypoint: Vector2): void { }
    tick(unit: GameObject, waypoint: Vector2, speed: number, isMoving: boolean): {
        distance: Vector3;
        done: boolean;
        isTeleport?: boolean;
    } {
        if (isMoving) {
            return { distance: new Vector3(), done: true };
        }
        this.distanceToWaypoint
            .copy(waypoint)
            .sub(unit.position.getMapPosition());
        const distance = this.distanceToWaypoint.length();
        const generalRules = this.game.rules.general;
        if (generalRules.chronoTrigger) {
            const delay = distance < generalRules.chronoRangeMinimum
                ? generalRules.chronoMinimumDelay
                : distance / generalRules.chronoDistanceFactor;
            unit.warpedOutTrait.setTimed(delay, false, this.game);
        }
        return {
            distance: new Vector3(this.distanceToWaypoint.x, 0, this.distanceToWaypoint.y),
            done: true,
            isTeleport: true
        };
    }
}

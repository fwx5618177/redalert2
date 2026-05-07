import { RadialTileFinder } from "@ra2/game/map/tileFinder/RadialTileFinder";
import { SuperWeaponEffect } from "@ra2/game/superweapon/SuperWeaponEffect";
import { Game } from "@ra2/game/Game";
export class IronCurtainEffect extends SuperWeaponEffect {
    onStart(game: Game) {
        const duration = game.rules.combatDamage.ironCurtainDuration;
        const source = { player: this.owner };
        const tileFinder = new RadialTileFinder(game.map.tiles, game.map.mapBounds, this.tile, { width: 1, height: 1 }, 0, 1, () => true);
        let tile;
        while ((tile = tileFinder.getNextTile())) {
            for (const object of game.map.getGroundObjectsOnTile(tile)) {
                if (!object.isTechno() ||
                    (object.isUnit() && object.tile !== tile) ||
                    object.rules.missileSpawn) {
                    continue;
                }
                if (object.rules.organic) {
                    if (!object.isDestroyed) {
                        game.destroyObject(object, source);
                    }
                }
                else {
                    object.invulnerableTrait.setActiveFor(duration, game.currentTick);
                    if ((object.isVehicle() || object.isAircraft()) &&
                        object.parasiteableTrait?.isInfested()) {
                        object.parasiteableTrait.destroyParasite(source, game);
                    }
                }
            }
        }
    }
    onTick(game: Game): boolean {
        return true;
    }
}

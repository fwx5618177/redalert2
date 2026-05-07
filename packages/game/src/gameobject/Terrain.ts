import { ObjectType } from '@ra2/engine/type/ObjectType';
import { GameObject } from '@ra2/game/gameobject/GameObject';
export class Terrain extends GameObject {
    radarInvisible: boolean;
    static factory(id: string, rules: any, owner: any): Terrain {
        return new this(id, rules, owner);
    }
    constructor(id: string, rules: any, owner: any) {
        super(ObjectType.Terrain, id, rules, owner);
        this.radarInvisible = this.rules.radarInvisible;
    }
}

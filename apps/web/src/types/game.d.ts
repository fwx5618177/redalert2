import type { Building as BuildingType } from "@ra2/game/gameobject/Building";
import type { Player as PlayerType } from "@ra2/game/Player";
import type { GameObject as GameObjectType } from "@ra2/game/gameobject/GameObject";
import type { Tile as TileType } from "@ra2/game/map/Tile";
declare global {
    type GameContext = import("@ra2/game/Game").Game;
    type Game = import("@ra2/game/Game").Game;
    type Building = BuildingType;
    type Player = PlayerType;
    type Unit = any;
    type GameObject = GameObjectType;
    type Tile = TileType;
}
export {};

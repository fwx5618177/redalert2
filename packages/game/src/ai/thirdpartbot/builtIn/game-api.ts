/**
 * Local shim for @chronodivide/game-api.
 * Re-exports all game API types needed by the builtIn bot from local sources.
 */

export { ActionsApi } from '@ra2/game/api/ActionsApi';
export { GameApi } from '@ra2/game/api/GameApi';
export { MapApi } from '@ra2/game/api/MapApi';
export { ProductionApi } from '@ra2/game/api/ProductionApi';
export { Bot } from '@ra2/game/bot/Bot';
export { ObjectType } from '@ra2/engine/type/ObjectType';
export { OrderType } from '@ra2/game/order/OrderType';
export { SideType } from '@ra2/game/SideType';
export { QueueType } from '@ra2/game/player/production/ProductionQueue';
export { QueueStatus } from '@ra2/game/player/production/ProductionQueue';
export { GameMath } from '@ra2/util/math/GameMath';
export { Box2 } from '@ra2/util/math/Box2';
export { Vector2 } from '@ra2/util/math/Vector2';
export { LandType } from '@ra2/game/type/LandType';
export { SpeedType } from '@ra2/game/type/SpeedType';
export { MovementZone } from '@ra2/game/type/MovementZone';
export { TerrainType } from '@ra2/engine/type/TerrainType';
export { AttackState } from '@ra2/game/gameobject/trait/AttackTrait';
export { StanceType } from '@ra2/game/gameobject/infantry/StanceType';
export { ZoneType } from '@ra2/game/gameobject/unit/ZoneType';
export { FactoryType } from '@ra2/game/rules/TechnoRules';
export { TechnoRules } from '@ra2/game/rules/TechnoRules';
export { WeaponRules } from '@ra2/game/rules/WeaponRules';
export { ProjectileRules } from '@ra2/game/rules/ProjectileRules';

// Re-export event types
export { ApiEventType } from '@ra2/game/api/EventsApi';

// Re-export interfaces
export type { GameObjectData } from '@ra2/game/api/interface/GameObjectData';
export type { PlayerData } from '@ra2/game/api/interface/PlayerData';
export type { UnitData } from '@ra2/game/api/interface/UnitData';
export type { PathNode } from '@ra2/game/api/interface/PathNode';
export type { Tile } from '@ra2/game/map/Tile';
export type { BuildingPlacementData } from '@ra2/game/api/interface/BuildingPlacementData';

/**
 * Rectangle interface for bounding area calculations.
 */
export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Types not directly exported from the original codebase - define locally

/**
 * ApiEvent union type matching events dispatched by EventsApi.
 */
export type ApiEvent = {
    type: number;
    objectId?: number;
    attackerInfo?: {
        playerName: string;
        objectId?: number;
    };
    [key: string]: any;
};

/**
 * BotContext - provides structured access to game, player, and APIs.
 * Used by the builtIn bot's mission/strategy system.
 */
export interface BotContext {
    readonly game: import('@ra2/game/api/GameApi').GameApi;
    readonly player: {
        readonly name: string;
        readonly actions: import('@ra2/game/api/ActionsApi').ActionsApi;
        readonly production: import('@ra2/game/api/ProductionApi').ProductionApi;
    };
}

/**
 * Size interface for map dimensions.
 */
export interface Size {
    width: number;
    height: number;
}

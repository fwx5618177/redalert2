import { TriggerEventType } from "@ra2/data/map/trigger/TriggerEventType";
import { ObjectType } from "@ra2/engine/type/ObjectType";
import { AmbientLightCondition } from "@ra2/game/trigger/condition/AmbientLightCondition";
import { AnyEventCondition } from "@ra2/game/trigger/condition/AnyEventCondition";
import { AttackedByAnyCondition } from "@ra2/game/trigger/condition/AttackedByAnyCondition";
import { AttackedByHouseCondition } from "@ra2/game/trigger/condition/AttackedByHouseCondition";
import { BuildingExistsCondition } from "@ra2/game/trigger/condition/BuildingExistsCondition";
import { BuildObjectTypeCondition } from "@ra2/game/trigger/condition/BuildObjectTypeCondition";
import { ComesNearWaypointCondition } from "@ra2/game/trigger/condition/ComesNearWaypointCondition";
import { CreditsBelowCondition } from "@ra2/game/trigger/condition/CreditsBelowCondition";
import { CreditsExceedCondition } from "@ra2/game/trigger/condition/CreditsExceedCondition";
import { CrossHorizLineCondition } from "@ra2/game/trigger/condition/CrossHorizLineCondition";
import { CrossVertLineCondition } from "@ra2/game/trigger/condition/CrossVertLineCondition";
import { DestroyedAllBuildingsCondition } from "@ra2/game/trigger/condition/DestroyedAllBuildingsCondition";
import { DestroyedAllCondition } from "@ra2/game/trigger/condition/DestroyedAllCondition";
import { DestroyedAllUnitsCondition } from "@ra2/game/trigger/condition/DestroyedAllUnitsCondition";
import { DestroyedAllUnitsLandCondition } from "@ra2/game/trigger/condition/DestroyedAllUnitsLandCondition";
import { DestroyedAllUnitsNavalCondition } from "@ra2/game/trigger/condition/DestroyedAllUnitsNavalCondition";
import { DestroyedBridgeCondition } from "@ra2/game/trigger/condition/DestroyedBridgeCondition";
import { DestroyedBuildingsCondition } from "@ra2/game/trigger/condition/DestroyedBuildingsCondition";
import { DestroyedByAnyCondition } from "@ra2/game/trigger/condition/DestroyedByAnyCondition";
import { DestroyedOrCapturedCondition } from "@ra2/game/trigger/condition/DestroyedOrCapturedCondition";
import { DestroyedOrCapturedOrInfiltratedCondition } from "@ra2/game/trigger/condition/DestroyedOrCapturedOrInfiltratedCondition";
import { DestroyedUnitsCondition } from "@ra2/game/trigger/condition/DestroyedUnitsCondition";
import { ElapsedScenarioTimeCondition } from "@ra2/game/trigger/condition/ElapsedScenarioTimeCondition";
import { ElapsedTimeCondition } from "@ra2/game/trigger/condition/ElapsedTimeCondition";
import { EnteredByCondition } from "@ra2/game/trigger/condition/EnteredByCondition";
import { GlobalVariableCondition } from "@ra2/game/trigger/condition/GlobalVariableCondition";
import { HealthBelowAnyCondition } from "@ra2/game/trigger/condition/HealthBelowAnyCondition";
import { HealthBelowCombatCondition } from "@ra2/game/trigger/condition/HealthBelowCombatCondition";
import { LocalVariableCondition } from "@ra2/game/trigger/condition/LocalVariableCondition";
import { LowPowerCondition } from "@ra2/game/trigger/condition/LowPowerCondition";
import { NoEventCondition } from "@ra2/game/trigger/condition/NoEventCondition";
import { NoFactoriesLeftCondition } from "@ra2/game/trigger/condition/NoFactoriesLeftCondition";
import { PickupCrateAnyCondition } from "@ra2/game/trigger/condition/PickupCrateAnyCondition";
import { PickupCrateCondition } from "@ra2/game/trigger/condition/PickupCrateCondition";
import { RandomDelayCondition } from "@ra2/game/trigger/condition/RandomDelayCondition";
import { SpiedByCondition } from "@ra2/game/trigger/condition/SpiedByCondition";
import { SpyEnteringAsHouseCondition } from "@ra2/game/trigger/condition/SpyEnteringAsHouseCondition";
import { SpyEnteringAsInfantryCondition } from "@ra2/game/trigger/condition/SpyEnteringAsInfantryCondition";
import { TimerExpiredCondition } from "@ra2/game/trigger/condition/TimerExpiredCondition";
export class TriggerConditionFactory {
    create(e: any, t: any) {
        switch (e.type) {
            case TriggerEventType.NoEvent:
                return new NoEventCondition(e, t);
            case TriggerEventType.EnteredBy:
                return new EnteredByCondition(e, t);
            case TriggerEventType.SpiedBy:
                return new SpiedByCondition(e, t);
            case TriggerEventType.AttackedByAny:
                return new AttackedByAnyCondition(e, t);
            case TriggerEventType.DestroyedByAny:
                return new DestroyedByAnyCondition(e, t);
            case TriggerEventType.AnyEvent:
                return new AnyEventCondition(e, t);
            case TriggerEventType.DestroyedAllUnits:
                return new DestroyedAllUnitsCondition(e, t);
            case TriggerEventType.DestroyedAllBuildings:
                return new DestroyedAllBuildingsCondition(e, t);
            case TriggerEventType.DestroyedAll:
                return new DestroyedAllCondition(e, t);
            case TriggerEventType.CreditsExceed:
                return new CreditsExceedCondition(e, t);
            case TriggerEventType.ElapsedTime:
                return new ElapsedTimeCondition(e, t);
            case TriggerEventType.MissionTimerExpired:
                return new TimerExpiredCondition(e, t);
            case TriggerEventType.DestroyedBuildings:
                return new DestroyedBuildingsCondition(e, t);
            case TriggerEventType.DestroyedUnits:
                return new DestroyedUnitsCondition(e, t);
            case TriggerEventType.NoFactoriesLeft:
                return new NoFactoriesLeftCondition(e, t);
            case TriggerEventType.BuildBuilding:
                return new BuildObjectTypeCondition(e, t, ObjectType.Building);
            case TriggerEventType.BuildUnit:
                return new BuildObjectTypeCondition(e, t, ObjectType.Vehicle);
            case TriggerEventType.BuildInfantry:
                return new BuildObjectTypeCondition(e, t, ObjectType.Infantry);
            case TriggerEventType.BuildAircraft:
                return new BuildObjectTypeCondition(e, t, ObjectType.Aircraft);
            case TriggerEventType.CrossesHorizontalLine:
                return new CrossHorizLineCondition(e, t);
            case TriggerEventType.CrossesVerticalLine:
                return new CrossVertLineCondition(e, t);
            case TriggerEventType.GlobalIsSet:
                return new GlobalVariableCondition(e, t, true);
            case TriggerEventType.GlobalIsCleared:
                return new GlobalVariableCondition(e, t, false);
            case TriggerEventType.DestroyedOrCaptured:
                return new DestroyedOrCapturedCondition(e, t);
            case TriggerEventType.LowPower:
                return new LowPowerCondition(e, t);
            case TriggerEventType.DestroyedBridge:
                return new DestroyedBridgeCondition(e, t);
            case TriggerEventType.BuildingExists:
                return new BuildingExistsCondition(e, t);
            case TriggerEventType.ComesNearWaypoint:
                return new ComesNearWaypointCondition(e, t);
            case TriggerEventType.LocalIsSet:
                return new LocalVariableCondition(e, t, true);
            case TriggerEventType.LocalIsCleared:
                return new LocalVariableCondition(e, t, false);
            case TriggerEventType.FirstDamagedCombat:
                return new HealthBelowCombatCondition(e, t, 100);
            case TriggerEventType.HalfHealthCombat:
                return new HealthBelowCombatCondition(e, t, 50);
            case TriggerEventType.QuarterHealthCombat:
                return new HealthBelowCombatCondition(e, t, 25);
            case TriggerEventType.FirstDamagedAny:
                return new HealthBelowAnyCondition(e, t, 100);
            case TriggerEventType.HalfHealthAny:
                return new HealthBelowAnyCondition(e, t, 50);
            case TriggerEventType.QuarterHealthAny:
                return new HealthBelowAnyCondition(e, t, 25);
            case TriggerEventType.AttackedByHouse:
                return new AttackedByHouseCondition(e, t);
            case TriggerEventType.AmbientLightBelow:
                return new AmbientLightCondition(e, t, "below");
            case TriggerEventType.AmbientLightAbove:
                return new AmbientLightCondition(e, t, "above");
            case TriggerEventType.ElapsedScenarioTime:
                return new ElapsedScenarioTimeCondition(e, t);
            case TriggerEventType.DestroyedOrCapturedOrInfiltrated:
                return new DestroyedOrCapturedOrInfiltratedCondition(e, t);
            case TriggerEventType.PickupCrate:
                return new PickupCrateCondition(e, t);
            case TriggerEventType.PickupCrateAny:
                return new PickupCrateAnyCondition(e, t);
            case TriggerEventType.RandomDelay:
                return new RandomDelayCondition(e, t);
            case TriggerEventType.CreditsBelow:
                return new CreditsBelowCondition(e, t);
            case TriggerEventType.SpyEnteringAsHouse:
                return new SpyEnteringAsHouseCondition(e, t);
            case TriggerEventType.SpyEnteringAsInfantry:
                return new SpyEnteringAsInfantryCondition(e, t);
            case TriggerEventType.DestroyedAllUnitsNaval:
                return new DestroyedAllUnitsNavalCondition(e, t);
            case TriggerEventType.DestroyedAllUnitsLand:
                return new DestroyedAllUnitsLandCondition(e, t);
            case TriggerEventType.BuildingNotExists:
                return new BuildingExistsCondition(e, t, true);
            default:
                throw new Error(`Unhandled trigger event type "${TriggerEventType[e.type]}"`);
        }
    }
}

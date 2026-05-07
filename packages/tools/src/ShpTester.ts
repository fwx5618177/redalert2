import { Renderer } from "@ra2/engine/gfx/Renderer";
import { UiScene } from "@ra2/gui/UiScene";
import { Hud } from "@ra2/gui/screen/game/component/Hud";
import { Engine } from "@ra2/engine/Engine";
import { Rules } from "@ra2/game/rules/Rules";
import { Art } from "@ra2/game/art/Art";
import { Country } from "@ra2/game/Country";
import { World } from "@ra2/game/World";
import { ObjectFactory } from "@ra2/game/gameobject/ObjectFactory";
import { ObjectArt } from "@ra2/game/art/ObjectArt";
import { ObjectType } from "@ra2/engine/type/ObjectType";
import { UiAnimationLoop } from "@ra2/engine/UiAnimationLoop";
import { Game } from "@ra2/game/Game";
import { JsxRenderer } from "@ra2/gui/jsx/JsxRenderer";
import { CompositeDisposable } from "@ra2/util/disposable/CompositeDisposable";
import { Alliances } from "@ra2/game/Alliances";
import { PlayerList } from "@ra2/game/PlayerList";
import { Pointer } from "@ra2/gui/Pointer";
import { BoxedVar } from "@ra2/util/BoxedVar";
import { TileCollection } from "@ra2/game/map/TileCollection";
import { TileOccupation } from "@ra2/game/map/TileOccupation";
import { Bridges } from "@ra2/game/map/Bridges";
import { UnitSelection } from "@ra2/game/gameobject/selection/UnitSelection";
import { GameModeType } from "@ra2/game/ini/GameModeType";
import { getRandomInt, clamp } from "@ra2/util/math";
import { TheaterType } from "@ra2/engine/TheaterType";
import { GameMap } from "@ra2/game/GameMap";
import { RadarTrait } from "@ra2/game/player/trait/RadarTrait";
import { Minimap } from "@ra2/gui/screen/game/component/Minimap";
import { Production } from "@ra2/game/player/production/Production";
import { CombatantSidebarModel } from "@ra2/gui/screen/game/component/hud/viewmodel/CombatantSidebarModel";
import { MessageList } from "@ra2/gui/screen/game/component/hud/viewmodel/MessageList";
import { MapShroudTrait } from "@ra2/game/trait/MapShroudTrait";
import { SellTrait } from "@ra2/game/trait/SellTrait";
import { MapBounds } from "@ra2/game/map/MapBounds";
import { mixDatabase } from "@ra2/engine/mixDatabase";
import { CommandBarButtonType } from "@ra2/gui/screen/game/component/hud/commandBar/CommandBarButtonType";
import { CanvasMetrics } from "@ra2/gui/CanvasMetrics";
import { StalemateDetectTrait } from "@ra2/game/trait/StalemateDetectTrait";
import { CountdownTimer } from "@ra2/game/CountdownTimer";
import { IniSection } from "@ra2/data/IniSection";
import { ChatHistory } from "@ra2/gui/chat/ChatHistory";
import { SidebarItemTargetType, SidebarCategory, SidebarItemStatus } from "@ra2/gui/screen/game/component/hud/viewmodel/SidebarModel";
import { PlayerFactory } from "@ra2/game/player/PlayerFactory";
import { ResourceType } from "@ra2/engine/resourceConfigs";
import { TestToolSupport, type TestToolRuntimeContext } from "@ra2/tools/TestToolSupport";
declare const THREE: any;
interface GameOptions {
    superWeapons: boolean;
    gameSpeed: number;
}
interface SidebarItem {
    target: {
        type: SidebarItemTargetType;
        rules: any;
    };
    cameo: string;
    disabled: boolean;
    progress: number;
    quantity: number;
    status: SidebarItemStatus;
}
interface MenuButton {
    label: string;
    disabled?: boolean;
    isBottom?: boolean;
    onClick: () => void;
}
export class ShpTester {
    private static disposables = new CompositeDisposable();
    static async main(mixFileLoader: any, gameMap: any, parentElement: HTMLElement, strings: any, context: TestToolRuntimeContext = {}): Promise<void> {
        await TestToolSupport.ensureTheater(TheaterType.Temperate, context.cdnResourceLoader, [ResourceType.UiAlly, ResourceType.Cameo]);
        this.buildHomeButton();
        const hostElement = TestToolSupport.prepareHost(context, 800, 600);
        const renderer = new Renderer(800, 600);
        renderer.init(hostElement);
        TestToolSupport.placeRendererCanvas(renderer, 0, 0);
        renderer.initStats(document.body);
        this.disposables.add(renderer);
        const uiScene = UiScene.factory({
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        });
        this.disposables.add(uiScene);
        const cameoDatabase = mixDatabase.get("cameo.mix");
        if (!cameoDatabase) {
            throw new Error("Missing file list database for cameos");
        }
        const rules = new Rules(Engine.getRules());
        const art = new Art(rules, Engine.getArt(), undefined, undefined);
        const theater = await Engine.loadTheater(TheaterType.Temperate);
        const gameMapInstance = new GameMap(gameMap, theater.tileSets, rules, (min: number, max: number) => getRandomInt(min, max));
        const gameOptions: GameOptions = {
            superWeapons: false,
            gameSpeed: 5
        };
        const playerFactory = new PlayerFactory(rules, gameOptions, []);
        const country = Country.factory("Americans", rules as any);
        const player = playerFactory.createCombatant("Player", country, 0, "Red", false, undefined);
        (player as any).radarTrait = new RadarTrait();
        (player as any).production = new Production(player, 10, gameOptions, rules, [
            ...(rules as any).buildingRules.values(),
            ...(rules as any).infantryRules.values(),
        ]);
        this.disposables.add(player);
        const world = new World();
        const playerList = new PlayerList();
        const alliances = new Alliances(playerList);
        const unitSelection = new UnitSelection();
        const tileCollection = new TileCollection([], null, rules.general, () => getRandomInt(0, 1000));
        const tileOccupation = new TileOccupation(tileCollection);
        const mapBounds = new MapBounds();
        const bridges = new Bridges(theater.tileSets, tileCollection, tileOccupation, mapBounds, rules);
        const gameSpeedVar = new BoxedVar(1);
        const objectFactory = new ObjectFactory(tileCollection, tileOccupation, bridges, gameSpeedVar);
        const game = new Game(world, gameMapInstance, rules, art, null, "0", 0, gameOptions, GameModeType.Battle, playerList, unitSelection, alliances, gameSpeedVar, objectFactory, null);
        game.addPlayer(player);
        game.mapShroudTrait = new MapShroudTrait(gameMapInstance, alliances);
        game.traits.add(game.mapShroudTrait);
        game.sellTrait = new SellTrait(game, game.rules.general);
        game.traits.add(game.sellTrait);
        const buildingTypes = [
            "GACNST",
            "GAPOWR",
            "GAREFN",
            "GAPILE",
            "GAAIRC",
            "GAWEAP",
            "GATECH",
            "NACNST",
            "NAPOWR",
        ];
        buildingTypes.forEach((buildingType) => {
            player.addOwnedObject(objectFactory.create(ObjectType.Building, buildingType, rules, art));
        });
        const combatantSidebarModel = new CombatantSidebarModel(player, game);
        combatantSidebarModel.powerDrained = 150;
        combatantSidebarModel.powerGenerated = 300;
        (player as any).radarTrait.setDisabled(false);
        const powerUpdateInterval = setInterval(() => {
            combatantSidebarModel.powerDrained = getRandomInt(0, 300);
            combatantSidebarModel.powerGenerated = getRandomInt(200, 1000);
            console.log(`Set power = ${combatantSidebarModel.powerGenerated}, drain = ${combatantSidebarModel.powerDrained}`);
        }, 5000);
        this.disposables.add(() => clearInterval(powerUpdateInterval));
        player.credits = 5000;
        const creditsUpdateInterval = setInterval(() => {
            player.credits = clamp(player.credits + getRandomInt(-1000, 1000), 0, 1000000);
            console.log("Set credits", player.credits);
        }, 5000);
        this.disposables.add(() => clearInterval(creditsUpdateInterval));
        for (const availableObject of (player as any).production.getAvailableObjects()) {
            const objectArt = ObjectArt.factory((availableObject as any).type, availableObject as any, Engine.getArt(), Engine.getArt().getSection((availableObject as any).imageName) ??
                new IniSection((availableObject as any).imageName));
            const tab = combatantSidebarModel.getTabForQueueType((player as any).production.getQueueTypeForObject(availableObject));
            const sidebarItem: SidebarItem = {
                target: {
                    type: SidebarItemTargetType.Techno,
                    rules: availableObject
                },
                cameo: objectArt.cameo,
                disabled: tab.id === SidebarCategory.Structures,
                progress: 0,
                quantity: 0,
                status: SidebarItemStatus.Idle,
            };
            tab.items.push(sidebarItem);
        }
        const firstActiveTabItem = combatantSidebarModel.activeTab.items[1];
        if (firstActiveTabItem) {
            firstActiveTabItem.disabled = false;
            firstActiveTabItem.progress = 0.75;
            firstActiveTabItem.quantity = 2;
            firstActiveTabItem.status = SidebarItemStatus.OnHold;
        }
        const firstInfantryItem = combatantSidebarModel.tabs[SidebarCategory.Infantry].items[0];
        if (firstInfantryItem) {
            firstInfantryItem.quantity = 5;
            firstInfantryItem.progress = 1;
            firstInfantryItem.status = SidebarItemStatus.Ready;
        }
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(canvasMetrics);
        const pointer = Pointer.factory(Engine.getImages().get("mouse.shp"), Engine.getPalettes().get("mousepal.pal"), renderer, document, canvasMetrics, new BoxedVar(false));
        pointer.init();
        pointer.lock();
        this.disposables.add(pointer);
        uiScene.add(pointer.getSprite());
        const jsxRenderer = new JsxRenderer(Engine.getImages(), Engine.getPalettes(), uiScene.getCamera(), pointer.pointerEvents);
        const messageList = new MessageList(game.rules.audioVisual.messageDuration, 6, player);
        const systemMessages = [
            "txt_low_power",
            "txt_space_cant_save",
            "txt_receiving_scenario",
            "txt_bad_chankey",
        ];
        let messageTimeout: number;
        const addRandomMessage = (): void => {
            const messageKey = strings.get(systemMessages[getRandomInt(0, systemMessages.length - 1)]);
            console.log("Add system message:", messageKey);
            messageList.addSystemMessage(messageKey, "#" + new THREE.Color(Math.random(), Math.random(), Math.random()).getHexString());
            messageTimeout = setTimeout(addRandomMessage, 5000 * Math.random());
        };
        messageTimeout = setTimeout(addRandomMessage, 5000 * Math.random());
        this.disposables.add(() => clearTimeout(messageTimeout));
        const hud = new Hud((player.country as any).side, uiScene.viewport, Engine.getImages() as any, Engine.getPalettes() as any, cameoDatabase, combatantSidebarModel, messageList, new ChatHistory(), new BoxedVar(""), new BoxedVar(false), undefined, [], new StalemateDetectTrait(), new CountdownTimer(), jsxRenderer, strings, Object.values(CommandBarButtonType).filter((value) => typeof value === "number") as CommandBarButtonType[], []);
        const minimap = new Minimap(game, player, 0xFFFFFF, rules.general.radar as any);
        minimap.setPointerEvents(pointer.pointerEvents);
        hud.setMinimap(minimap);
        this.disposables.add(minimap);
        uiScene.add(hud);
        hud.onSidebarSlotClick.subscribe((slotData: any) => {
            console.log("clicked", slotData);
        });
        hud.onOptButtonClick.subscribe(() => {
            pointer.unlock();
            const menuButtons: MenuButton[] = [
                {
                    label: "Button 1",
                    onClick(): void {
                        console.log("button 1 clicked");
                    },
                },
                {
                    label: "Button 2",
                    disabled: true,
                    onClick(): void {
                        console.error("button 2 should not trigger onClick");
                    },
                },
                {
                    label: "Exit",
                    isBottom: true,
                    onClick(): void {
                        pointer.lock();
                        hud.hideSidebarMenu();
                    },
                },
            ];
            hud.showSidebarMenu(menuButtons);
        });
        hud.onRepairButtonClick.subscribe(() => {
            (player as any).radarTrait.setDisabled(!(player as any).radarTrait.isDisabled());
        });
        hud.onCommandBarButtonClick.subscribe((buttonType: CommandBarButtonType) => {
            console.log("Clicked command bar -> " + CommandBarButtonType[buttonType]);
        });
        const startTime = new Date().getTime();
        renderer.addScene(uiScene);
        const uiAnimationLoop = new UiAnimationLoop(renderer);
        this.disposables.add(uiAnimationLoop);
        uiAnimationLoop.start();
        const endTime = new Date().getTime();
        console.log("Rendering took " + (endTime - startTime) + "ms");
        hostElement.appendChild(uiScene.getHtmlContainer().getElement());
        this.disposables.add(() => {
            uiScene.getHtmlContainer().getElement().remove();
        });
        TestToolSupport.setState('shp', {
            activeTab: combatantSidebarModel.activeTab.id,
            structureItems: combatantSidebarModel.tabs[SidebarCategory.Structures].items.length,
            infantryItems: combatantSidebarModel.tabs[SidebarCategory.Infantry].items.length,
            messageCount: messageList.getAll().length,
        });
    }
    private static buildHomeButton(): void {
        const homeButton = document.createElement('button');
        homeButton.innerHTML = '点此返回主页';
        homeButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: 10px;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
        homeButton.onmouseover = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            homeButton.style.transform = 'translateX(-50%) translateY(-2px)';
            homeButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        };
        homeButton.onmouseout = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            homeButton.style.transform = 'translateX(-50%) translateY(0)';
            homeButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        };
        homeButton.onclick = () => {
            window.location.hash = '/';
        };
        document.body.appendChild(homeButton);
        this.disposables.add(() => homeButton.remove());
    }
    static destroy(): void {
        TestToolSupport.clearState('shp');
        this.disposables.dispose();
        try {
            import("@ra2/engine/renderable/entity/PipOverlay").then(({ PipOverlay }) => {
                (PipOverlay as any)?.clearCaches?.();
            }).catch(() => { });
            import("@ra2/engine/gfx/TextureUtils").then(({ TextureUtils }) => {
                if ((TextureUtils as any)?.cache) {
                    (TextureUtils as any).cache.forEach((tex: any) => tex.dispose?.());
                    (TextureUtils as any).cache.clear();
                }
            }).catch(() => { });
        }
        catch (err) {
            console.warn('[ShpTester] Failed to clear caches during destroy:', err);
        }
    }
}

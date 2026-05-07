import { CompositeDisposable } from '@ra2/util/disposable/CompositeDisposable';
import { Coords } from '@ra2/util/Coords';
import { EventType } from '@ra2/game/event/EventType';
interface Game {
    events: {
        subscribe: (event: EventType, handler: (event: any) => void) => {
            dispose: () => void;
        };
    };
}
interface RenderableManager {
    createTransientAnim: (name: string, callback: (anim: any) => void) => any;
}
interface TriggerAnimEvent {
    type: EventType;
    name: string;
    tile: {
        rx: number;
        ry: number;
        z: number;
    };
}
export class TriggerActionFxHandler {
    private game: Game;
    private renderableManager: RenderableManager;
    private disposables: CompositeDisposable;
    private handleEvent: (event: TriggerAnimEvent) => void;
    constructor(game: Game, renderableManager: RenderableManager) {
        this.game = game;
        this.renderableManager = renderableManager;
        this.disposables = new CompositeDisposable();
        this.handleEvent = (event: TriggerAnimEvent) => {
            switch (event.type) {
                case EventType.TriggerAnim: {
                    const animName = event.name;
                    this.renderableManager.createTransientAnim(animName, (anim) => {
                        const position = Coords.tile3dToWorld(event.tile.rx + 0.5, event.tile.ry + 0.5, event.tile.z);
                        anim.setPosition(position);
                    });
                    break;
                }
            }
        };
    }
    init(): void {
        // Mirrors ParasiteSparkFxHandler etc. — subscribe takes (eventType, handler);
        // the handler's internal switch is defensive in case the bus ever
        // delivers other events through this subscription.
        this.disposables.add(this.game.events.subscribe(EventType.TriggerAnim, this.handleEvent));
    }
    dispose(): void {
        this.disposables.dispose();
    }
}

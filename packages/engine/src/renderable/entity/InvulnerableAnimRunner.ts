import { SimpleRunner } from '@ra2/engine/animation/SimpleRunner';
import { Animation } from '@ra2/engine/Animation';
import { AnimProps } from '@ra2/engine/AnimProps';
import { IniSection } from '@ra2/data/IniSection';
import { ShpFile } from '@ra2/data/ShpFile';
export class InvulnerableAnimRunner extends SimpleRunner {
    private minAmount: number;
    private maxAmount: number;
    private steps: number;
    declare animation: Animation;
    constructor(gameSpeed: number, minAmount: number = -0.75, maxAmount: number = -0.5, steps: number = 10, rate: number = 10) {
        super();
        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.steps = steps;
        const props = new AnimProps(new IniSection("dummy"), new ShpFile());
        props.rate = rate;
        props.loopEnd = steps;
        props.loopCount = -1;
        this.animation = new Animation(props, gameSpeed as any);
        this.animation.stop();
    }
    animate(): void {
        this.animation.reset();
    }
    getValue(): number {
        return this.minAmount +
            ((1 + Math.sin((2 * Math.PI * this.getCurrentFrame()) / this.steps)) / 2) *
                (this.maxAmount - this.minAmount);
    }
}

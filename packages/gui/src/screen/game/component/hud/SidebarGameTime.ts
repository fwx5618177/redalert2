import * as THREE from "three";
import { jsx } from "@ra2/gui/jsx/jsx";
import { UiObject } from "@ra2/gui/UiObject";
import { UiComponent, UiComponentProps } from "@ra2/gui/jsx/UiComponent";
import { HtmlContainer } from "@ra2/gui/HtmlContainer";
import { UiText } from "@ra2/gui/component/UiText";
import { formatTimeDuration } from "@ra2/util/format";
type SidebarModel = {
    currentGameTime: number;
    replayTime?: number;
    topTextLeftAlign: boolean;
};
type SidebarGameTimeProps = UiComponentProps & {
    textColor: string;
    width: number;
    height: number;
    zIndex?: number;
    sidebarModel: SidebarModel;
};
export class SidebarGameTime extends UiComponent<SidebarGameTimeProps> {
    text!: UiText;
    lastUpdate?: number;
    lastGameTime?: number;
    lastLeftAligned?: boolean;
    createUiObject(): UiObject {
        return new UiObject(new THREE.Object3D(), new HtmlContainer());
    }
    defineChildren() {
        const { textColor, width, height, zIndex } = this.props;
        return jsx(UiText, {
            ref: (e: UiText) => (this.text = e),
            value: "",
            textColor,
            width,
            height,
            zIndex,
        });
    }
    onFrame(now: number) {
        const { sidebarModel: { currentGameTime, replayTime, topTextLeftAlign }, } = this.props;
        if (!this.lastUpdate || now - this.lastUpdate >= 50) {
            this.lastUpdate = now;
            if (this.lastGameTime !== currentGameTime) {
                this.text.setValue(formatTimeDuration(currentGameTime) +
                    (replayTime ? " / " + formatTimeDuration(replayTime) : ""));
                this.lastGameTime = currentGameTime;
            }
            if (topTextLeftAlign !== this.lastLeftAligned) {
                if (topTextLeftAlign) {
                    this.text.setTextAlign("left");
                    this.text.getUiObject().setPosition(15, 0);
                }
                else {
                    this.text.setTextAlign("center");
                    this.text.getUiObject().setPosition(0, 0);
                }
                this.lastLeftAligned = topTextLeftAlign;
            }
        }
    }
}
export default SidebarGameTime;

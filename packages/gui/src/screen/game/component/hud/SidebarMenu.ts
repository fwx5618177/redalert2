import * as THREE from "three";
import { jsx, createRef } from "@ra2/gui/jsx/jsx";
import { MenuButton } from "@ra2/gui/component/MenuButton";
import { UiObject } from "@ra2/gui/UiObject";
import { HtmlContainer } from "@ra2/gui/HtmlContainer";
import { HtmlView } from "@ra2/gui/jsx/HtmlView";
import { UiComponent, UiComponentProps } from "@ra2/gui/jsx/UiComponent";
type SidebarMenuButton = {
    label: string;
    disabled?: boolean;
    isBottom?: boolean;
    onClick?: () => void;
};
type SidebarMenuProps = UiComponentProps & {
    buttons: SidebarMenuButton[];
    buttonImg: any;
    buttonPal?: any;
    menuHeight: number;
};
export class SidebarMenu extends UiComponent<SidebarMenuProps> {
    createUiObject(): UiObject {
        return new UiObject(new THREE.Object3D(), new HtmlContainer());
    }
    defineChildren() {
        return this.props.buttons.map((btn, idx) => this.createButton(btn, idx));
    }
    createButton(btn: SidebarMenuButton, idx: number) {
        const img = this.props.buttonImg;
        let pos = { x: 0, y: idx * img.height };
        if (btn.isBottom) {
            pos.y = this.props.menuHeight - img.height;
        }
        const box = { x: pos.x, y: pos.y, width: img.width, height: img.height };
        const spriteRef = createRef<any>();
        return jsx("fragment", null, jsx("sprite", {
            image: img,
            palette: this.props.buttonPal,
            x: pos.x,
            y: pos.y,
            ref: spriteRef,
        }), jsx(HtmlView, {
            component: MenuButton,
            props: {
                buttonConfig: { label: btn.label, disabled: !!btn.disabled },
                box: { x: box.x, y: box.y, width: box.width, height: box.height },
                onMouseDown: (e: any) => {
                    spriteRef.current.setFrame(1);
                    const upHandler = () => {
                        spriteRef.current.setFrame(0);
                        document.removeEventListener("mouseup", upHandler);
                    };
                    document.addEventListener("mouseup", upHandler);
                },
                onClick: (e: any) => {
                    btn.onClick && btn.onClick();
                },
            },
        }));
    }
}
export default SidebarMenu;

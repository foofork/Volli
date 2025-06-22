import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        variant?: string;
        disabled?: boolean;
    };
    events: {
        click: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type SimpleButtonProps = typeof __propDef.props;
export type SimpleButtonEvents = typeof __propDef.events;
export type SimpleButtonSlots = typeof __propDef.slots;
export default class SimpleButton extends SvelteComponent<SimpleButtonProps, SimpleButtonEvents, SimpleButtonSlots> {
}
export {};

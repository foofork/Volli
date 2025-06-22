import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        label?: string;
        error?: string;
        hint?: string;
        value?: string;
        type?: string;
        placeholder?: string;
        name?: string;
        id?: string;
        required?: boolean;
        readonly?: boolean;
        disabled?: boolean;
        class?: string;
    };
    events: {
        input: Event;
        change: Event;
        focus: FocusEvent;
        blur: FocusEvent;
        keydown: KeyboardEvent;
        keyup: KeyboardEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type InputProps = typeof __propDef.props;
export type InputEvents = typeof __propDef.events;
export type InputSlots = typeof __propDef.slots;
export default class Input extends SvelteComponent<InputProps, InputEvents, InputSlots> {
}
export {};

import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
        size?: 'sm' | 'md' | 'lg';
        loading?: boolean;
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
        class?: string;
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
export type ButtonProps = typeof __propDef.props;
export type ButtonEvents = typeof __propDef.events;
export type ButtonSlots = typeof __propDef.slots;
export default class Button extends SvelteComponent<ButtonProps, ButtonEvents, ButtonSlots> {
}
export {};

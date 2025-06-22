import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        placeholder?: string;
        maxLength?: number;
        disabled?: boolean;
        className?: string;
    };
    events: {
        send: CustomEvent<any>;
        typing: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type MessageComposerProps = typeof __propDef.props;
export type MessageComposerEvents = typeof __propDef.events;
export type MessageComposerSlots = typeof __propDef.slots;
export default class MessageComposer extends SvelteComponent<MessageComposerProps, MessageComposerEvents, MessageComposerSlots> {
}
export {};

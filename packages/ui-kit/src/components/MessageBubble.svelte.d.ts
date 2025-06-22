import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        content: any;
        sender: any;
        timestamp: any;
        isOwn?: boolean;
        status?: string;
        className?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type MessageBubbleProps = typeof __propDef.props;
export type MessageBubbleEvents = typeof __propDef.events;
export type MessageBubbleSlots = typeof __propDef.slots;
export default class MessageBubble extends SvelteComponent<MessageBubbleProps, MessageBubbleEvents, MessageBubbleSlots> {
}
export {};

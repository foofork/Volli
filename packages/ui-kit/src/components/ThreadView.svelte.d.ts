import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        thread?: null;
        messages?: any[];
        currentUserId: any;
        isTyping?: boolean;
        typingUser?: string;
        className?: string;
    };
    events: {
        loadMore: CustomEvent<any>;
        sendMessage: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ThreadViewProps = typeof __propDef.props;
export type ThreadViewEvents = typeof __propDef.events;
export type ThreadViewSlots = typeof __propDef.slots;
export default class ThreadView extends SvelteComponent<ThreadViewProps, ThreadViewEvents, ThreadViewSlots> {
}
export {};

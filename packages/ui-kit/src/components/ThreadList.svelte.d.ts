import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        threads?: any[];
        selectedThreadId?: null;
        className?: string;
    };
    events: {
        select: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ThreadListProps = typeof __propDef.props;
export type ThreadListEvents = typeof __propDef.events;
export type ThreadListSlots = typeof __propDef.slots;
export default class ThreadList extends SvelteComponent<ThreadListProps, ThreadListEvents, ThreadListSlots> {
}
export {};

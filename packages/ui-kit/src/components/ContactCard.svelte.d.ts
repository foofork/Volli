import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        contact: any;
        showActions?: boolean;
        className?: string;
    };
    events: {
        message: CustomEvent<any>;
        verify: CustomEvent<any>;
        remove: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ContactCardProps = typeof __propDef.props;
export type ContactCardEvents = typeof __propDef.events;
export type ContactCardSlots = typeof __propDef.slots;
export default class ContactCard extends SvelteComponent<ContactCardProps, ContactCardEvents, ContactCardSlots> {
}
export {};

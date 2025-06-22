import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        settings?: {
            displayName: string;
            theme: string;
            notifications: boolean;
            soundEnabled: boolean;
            autoBackup: boolean;
            backupInterval: number;
        };
        className?: string;
    };
    events: {
        export: CustomEvent<any>;
        import: CustomEvent<any>;
        save: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type SettingsPanelProps = typeof __propDef.props;
export type SettingsPanelEvents = typeof __propDef.events;
export type SettingsPanelSlots = typeof __propDef.slots;
export default class SettingsPanel extends SvelteComponent<SettingsPanelProps, SettingsPanelEvents, SettingsPanelSlots> {
}
export {};

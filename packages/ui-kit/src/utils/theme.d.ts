export type Theme = 'light' | 'dark' | 'system';
export declare const theme: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<Theme>, invalidate?: import("svelte/store").Invalidator<Theme> | undefined) => import("svelte/store").Unsubscriber;
    set: (theme: Theme) => void;
    toggle: () => void;
    init: () => void;
};

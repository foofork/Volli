

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.8b592b8a.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js"];
export const stylesheets = [];
export const fonts = [];

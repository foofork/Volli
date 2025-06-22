

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.619fbc19.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/singletons.f0d114dd.js","_app/immutable/chunks/index.045fc982.js"];
export const stylesheets = [];
export const fonts = [];

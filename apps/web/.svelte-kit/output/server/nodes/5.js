

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/contacts/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/5.1ef152a0.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/each.3d878967.js"];
export const stylesheets = ["_app/immutable/assets/5.e597e346.css"];
export const fonts = [];

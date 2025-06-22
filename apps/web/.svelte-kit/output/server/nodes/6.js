

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/files/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/6.e885634f.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/each.3d878967.js"];
export const stylesheets = ["_app/immutable/assets/6.7405310e.css"];
export const fonts = [];

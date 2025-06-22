

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/auth/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.6ca44d40.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/navigation.40a9cf0e.js","_app/immutable/chunks/singletons.f0d114dd.js","_app/immutable/chunks/index.045fc982.js","_app/immutable/chunks/auth.1e7963e3.js"];
export const stylesheets = ["_app/immutable/assets/8.05450ee0.css"];
export const fonts = [];

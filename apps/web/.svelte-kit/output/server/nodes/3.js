

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.2f05596d.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/navigation.40a9cf0e.js","_app/immutable/chunks/singletons.f0d114dd.js","_app/immutable/chunks/index.045fc982.js","_app/immutable/chunks/auth.1e7963e3.js"];
export const stylesheets = ["_app/immutable/assets/3.a9983d63.css"];
export const fonts = [];

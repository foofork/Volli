

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.08e5077c.js","_app/immutable/chunks/scheduler.f21026e3.js","_app/immutable/chunks/index.887ba7b1.js","_app/immutable/chunks/navigation.40a9cf0e.js","_app/immutable/chunks/singletons.f0d114dd.js","_app/immutable/chunks/index.045fc982.js","_app/immutable/chunks/auth.1e7963e3.js","_app/immutable/chunks/vault.4a87f3ed.js","_app/immutable/chunks/messages.8ac05859.js"];
export const stylesheets = ["_app/immutable/assets/2.74bb6e2b.css"];
export const fonts = [];

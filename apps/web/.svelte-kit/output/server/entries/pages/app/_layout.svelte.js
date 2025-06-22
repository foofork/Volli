import { c as create_ssr_component, a as subscribe } from "../../../chunks/ssr.js";
import { a as auth } from "../../../chunks/auth.js";
import { v as vault } from "../../../chunks/messages.js";
const _layout_svelte_svelte_type_style_lang = "";
const css = {
  code: ".app-layout.svelte-1jxaca9.svelte-1jxaca9{display:flex;height:100vh;background:#0a0a0a;color:#fff}.sidebar.svelte-1jxaca9.svelte-1jxaca9{width:280px;background:rgba(255, 255, 255, 0.03);border-right:1px solid rgba(255, 255, 255, 0.1);display:flex;flex-direction:column}.sidebar-header.svelte-1jxaca9.svelte-1jxaca9{padding:1.5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255, 255, 255, 0.1)}.sidebar-header.svelte-1jxaca9 h1.svelte-1jxaca9{font-size:1.5rem;margin:0;background:linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.icon-button.svelte-1jxaca9.svelte-1jxaca9{width:36px;height:36px;border-radius:8px;border:none;background:rgba(255, 255, 255, 0.05);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease}.icon-button.svelte-1jxaca9.svelte-1jxaca9:hover{background:rgba(255, 255, 255, 0.1)}.nav-menu.svelte-1jxaca9.svelte-1jxaca9{flex:1;padding:1rem 0;overflow-y:auto}.nav-item.svelte-1jxaca9.svelte-1jxaca9{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1.5rem;color:#aaa;text-decoration:none;transition:all 0.3s ease;position:relative}.nav-item.svelte-1jxaca9.svelte-1jxaca9:hover{color:#fff;background:rgba(255, 255, 255, 0.05)}.nav-item.active.svelte-1jxaca9.svelte-1jxaca9{color:#3B82F6;background:rgba(59, 130, 246, 0.1)}.nav-item.active.svelte-1jxaca9.svelte-1jxaca9::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#3B82F6}.nav-item.svelte-1jxaca9 .icon.svelte-1jxaca9{font-size:1.25rem}.sidebar-footer.svelte-1jxaca9.svelte-1jxaca9{padding:1rem;border-top:1px solid rgba(255, 255, 255, 0.1);display:flex;align-items:center;gap:0.5rem}.user-info.svelte-1jxaca9.svelte-1jxaca9{flex:1;display:flex;align-items:center;gap:0.75rem}.avatar.svelte-1jxaca9.svelte-1jxaca9{width:40px;height:40px;border-radius:50%;background:rgba(255, 255, 255, 0.1);display:flex;align-items:center;justify-content:center;font-size:1.25rem}.user-details.svelte-1jxaca9.svelte-1jxaca9{flex:1}.user-name.svelte-1jxaca9.svelte-1jxaca9{font-weight:600;font-size:0.9rem}.user-status.svelte-1jxaca9.svelte-1jxaca9{font-size:0.8rem;color:#4ADE80}.main-content.svelte-1jxaca9.svelte-1jxaca9{flex:1;display:flex;flex-direction:column;overflow:hidden}.loading.svelte-1jxaca9.svelte-1jxaca9{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:1.5rem}.spinner.svelte-1jxaca9.svelte-1jxaca9{width:48px;height:48px;border:3px solid rgba(255, 255, 255, 0.1);border-top-color:#3B82F6;border-radius:50%;animation:svelte-1jxaca9-spin 1s linear infinite}@keyframes svelte-1jxaca9-spin{to{transform:rotate(360deg)}}.loading.svelte-1jxaca9 p.svelte-1jxaca9{color:#888;font-size:1.1rem}@media(max-width: 768px){.sidebar.svelte-1jxaca9.svelte-1jxaca9{width:80px}.sidebar-header.svelte-1jxaca9 h1.svelte-1jxaca9{display:none}.nav-item.svelte-1jxaca9 span.svelte-1jxaca9:not(.icon){display:none}.user-details.svelte-1jxaca9.svelte-1jxaca9{display:none}}",
  map: null
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_vault;
  let $$unsubscribe_auth;
  $$unsubscribe_vault = subscribe(vault, (value) => value);
  $$unsubscribe_auth = subscribe(auth, (value) => value);
  $$result.css.add(css);
  $$unsubscribe_vault();
  $$unsubscribe_auth();
  return `${`<div class="loading svelte-1jxaca9" data-svelte-h="svelte-18o78ex"><div class="spinner svelte-1jxaca9"></div> <p class="svelte-1jxaca9">Initializing secure environment...</p></div>`}`;
});
export {
  Layout as default
};
//# sourceMappingURL=_layout.svelte.js.map

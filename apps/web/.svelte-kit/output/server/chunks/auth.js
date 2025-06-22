import { d as derived, w as writable } from "./index.js";
function createAuthStore() {
  const { subscribe, set, update } = writable({
    identity: null,
    device: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });
  async function initialize() {
    update((state) => ({ ...state, isLoading: true, error: null }));
    try {
      const storedIdentity = localStorage.getItem("volli_identity");
      if (storedIdentity) {
        const identity = JSON.parse(storedIdentity);
        update((state) => ({
          ...state,
          identity,
          isAuthenticated: true,
          isLoading: false
        }));
      } else {
        update((state) => ({ ...state, isLoading: false }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize"
      }));
    }
  }
  async function createIdentity(displayName) {
    update((state) => ({ ...state, isLoading: true, error: null }));
    try {
      const identity = {
        id: crypto.randomUUID(),
        publicKey: new Uint8Array(32),
        devices: [],
        createdAt: /* @__PURE__ */ new Date(),
        recoveryKey: new Uint8Array(32)
      };
      const device = {
        id: crypto.randomUUID(),
        name: displayName,
        publicKey: new Uint8Array(32),
        type: "primary",
        platform: "web",
        lastSeen: /* @__PURE__ */ new Date(),
        capabilities: ["messaging", "storage"]
      };
      localStorage.setItem("volli_identity", JSON.stringify(identity));
      localStorage.setItem("volli_device", JSON.stringify(device));
      update((state) => ({
        ...state,
        identity,
        device,
        isAuthenticated: true,
        isLoading: false
      }));
    } catch (error) {
      update((state) => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create identity"
      }));
    }
  }
  async function logout() {
    localStorage.removeItem("volli_identity");
    localStorage.removeItem("volli_device");
    localStorage.removeItem("volli_vault_key");
    set({
      identity: null,
      device: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }
  return {
    subscribe,
    initialize,
    createIdentity,
    logout
  };
}
const auth = createAuthStore();
derived(auth, ($auth) => $auth.isAuthenticated);
export {
  auth as a
};
//# sourceMappingURL=auth.js.map

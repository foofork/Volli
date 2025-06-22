import { w as writable, d as derived } from "./index.js";
import { a as auth } from "./auth.js";
import { f as get_store_value } from "./ssr.js";
function createVaultStore() {
  const { subscribe, set, update } = writable({
    isInitialized: false,
    isUnlocked: false,
    isLoading: false,
    error: null,
    collections: []
  });
  let vaultKey = null;
  async function initialize() {
    update((state) => ({ ...state, isLoading: true, error: null }));
    try {
      const authState = get_store_value(auth);
      if (!authState.isAuthenticated) {
        throw new Error("Not authenticated");
      }
      const storedKey = sessionStorage.getItem("volli_vault_key");
      if (storedKey) {
        vaultKey = new Uint8Array(Buffer.from(storedKey, "base64"));
        update((state) => ({
          ...state,
          isInitialized: true,
          isUnlocked: true,
          isLoading: false,
          collections: ["messages", "contacts", "files"]
        }));
      } else {
        update((state) => ({
          ...state,
          isInitialized: true,
          isUnlocked: false,
          isLoading: false
        }));
      }
    } catch (error) {
      update((state) => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize vault"
      }));
    }
  }
  async function unlock(passphrase) {
    update((state) => ({ ...state, isLoading: true, error: null }));
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      vaultKey = new Uint8Array(hashBuffer);
      sessionStorage.setItem("volli_vault_key", Buffer.from(vaultKey).toString("base64"));
      update((state) => ({
        ...state,
        isUnlocked: true,
        isLoading: false,
        collections: ["messages", "contacts", "files"]
      }));
    } catch (error) {
      update((state) => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to unlock vault"
      }));
    }
  }
  async function lock() {
    vaultKey = null;
    sessionStorage.removeItem("volli_vault_key");
    update((state) => ({
      ...state,
      isUnlocked: false,
      collections: []
    }));
  }
  async function store(collection, data) {
    if (!vaultKey)
      throw new Error("Vault is locked");
    const db = await openDB();
    const tx = db.transaction(collection, "readwrite");
    await tx.objectStore(collection).put({
      id: data.id || crypto.randomUUID(),
      data: JSON.stringify(data),
      timestamp: Date.now()
    });
  }
  async function query(collection, options) {
    if (!vaultKey)
      throw new Error("Vault is locked");
    const db = await openDB();
    const tx = db.transaction(collection, "readonly");
    const items = await tx.objectStore(collection).getAll();
    return items.map((item) => JSON.parse(item.data));
  }
  async function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("volli_vault", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        ["messages", "contacts", "files"].forEach((collection) => {
          if (!db.objectStoreNames.contains(collection)) {
            db.createObjectStore(collection, { keyPath: "id" });
          }
        });
      };
    });
  }
  return {
    subscribe,
    initialize,
    unlock,
    lock,
    store,
    query
  };
}
const vault = createVaultStore();
function createMessagesStore() {
  const { subscribe, set, update } = writable({
    conversations: /* @__PURE__ */ new Map(),
    messages: /* @__PURE__ */ new Map(),
    activeConversationId: null,
    isLoading: false,
    error: null
  });
  async function loadConversations() {
    update((state) => ({ ...state, isLoading: true, error: null }));
    try {
      const conversations = await vault.query("messages", {
        type: "conversation"
      });
      const conversationsMap = /* @__PURE__ */ new Map();
      conversations.forEach((conv) => {
        conversationsMap.set(conv.id, conv);
      });
      update((state) => ({
        ...state,
        conversations: conversationsMap,
        isLoading: false
      }));
    } catch (error) {
      update((state) => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load conversations"
      }));
    }
  }
  async function loadMessages(conversationId) {
    try {
      const messages2 = await vault.query("messages", {
        conversationId,
        type: "message"
      });
      update((state) => {
        const newMessages = new Map(state.messages);
        newMessages.set(conversationId, messages2);
        return { ...state, messages: newMessages };
      });
    } catch (error) {
      update((state) => ({
        ...state,
        error: error instanceof Error ? error.message : "Failed to load messages"
      }));
    }
  }
  async function createConversation(participants, name) {
    const conversation = {
      id: crypto.randomUUID(),
      type: participants.length > 2 ? "group" : "direct",
      participants,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      metadata: {
        name: name || `Chat with ${participants.join(", ")}`,
        avatar: "",
        description: ""
      }
    };
    await vault.store("messages", { ...conversation, type: "conversation" });
    update((state) => {
      const newConversations = new Map(state.conversations);
      newConversations.set(conversation.id, conversation);
      return { ...state, conversations: newConversations };
    });
    return conversation.id;
  }
  async function sendMessage(conversationId, content) {
    const message = {
      id: crypto.randomUUID(),
      conversationId,
      senderId: "current-user",
      // Get from auth store
      content,
      timestamp: /* @__PURE__ */ new Date(),
      status: "sent",
      version: 1
    };
    await vault.store("messages", { ...message, type: "message" });
    update((state) => {
      const newMessages = new Map(state.messages);
      const conversationMessages = newMessages.get(conversationId) || [];
      newMessages.set(conversationId, [...conversationMessages, message]);
      const newConversations = new Map(state.conversations);
      const conversation = newConversations.get(conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.updatedAt = /* @__PURE__ */ new Date();
        newConversations.set(conversationId, conversation);
      }
      return {
        ...state,
        messages: newMessages,
        conversations: newConversations
      };
    });
  }
  function setActiveConversation(conversationId) {
    update((state) => ({ ...state, activeConversationId: conversationId }));
    if (conversationId) {
      loadMessages(conversationId);
    }
  }
  return {
    subscribe,
    loadConversations,
    loadMessages,
    createConversation,
    sendMessage,
    setActiveConversation
  };
}
const messages = createMessagesStore();
const activeConversation = derived(
  messages,
  ($messages) => $messages.activeConversationId ? $messages.conversations.get($messages.activeConversationId) : null
);
const activeMessages = derived(
  messages,
  ($messages) => $messages.activeConversationId ? $messages.messages.get($messages.activeConversationId) || [] : []
);
export {
  activeConversation as a,
  activeMessages as b,
  messages as m,
  vault as v
};
//# sourceMappingURL=messages.js.map

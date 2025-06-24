import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  
  let toastId = 0;
  
  function add(type: ToastType, message: string, duration = 3000) {
    const id = `toast-${++toastId}`;
    const toast: Toast = { id, type, message, duration };
    
    update(toasts => [...toasts, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
    
    return id;
  }
  
  function remove(id: string) {
    update(toasts => toasts.filter(t => t.id !== id));
  }
  
  function success(message: string, duration?: number) {
    return add('success', message, duration);
  }
  
  function error(message: string, duration?: number) {
    return add('error', message, duration || 5000); // Errors show longer
  }
  
  function info(message: string, duration?: number) {
    return add('info', message, duration);
  }
  
  function warning(message: string, duration?: number) {
    return add('warning', message, duration);
  }
  
  function clear() {
    update(() => []);
  }
  
  return {
    subscribe,
    success,
    error,
    info,
    warning,
    remove,
    clear
  };
}

export const toasts = createToastStore();
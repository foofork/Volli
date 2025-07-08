/**
 * Secure session management using sessionStorage instead of localStorage
 * to prevent XSS attacks from persisting stolen tokens across browser sessions
 */

export interface SessionData {
  token: string;
  expiresAt: number;
  createdAt: number;
}

export const SESSION_KEY = 'volli-session';
export const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const secureSession = {
  /**
   * Store session token with automatic expiry
   */
  store: (token: string): void => {
    const sessionData: SessionData = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TIMEOUT,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // Set up automatic cleanup after expiry
    setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
    }, SESSION_TIMEOUT);
  },

  /**
   * Retrieve session token if valid
   */
  get: (): SessionData | null => {
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (!data) return null;

      const session = JSON.parse(data) as SessionData;

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch {
      // Handle corrupted data
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  /**
   * Remove session
   */
  remove: (): void => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  /**
   * Check if session exists and is valid
   */
  isValid: (): boolean => {
    return secureSession.get() !== null;
  },

  /**
   * Refresh session expiry time
   */
  refresh: (): void => {
    const session = secureSession.get();
    if (session) {
      secureSession.store(session.token);
    }
  },

  /**
   * Get remaining time until session expires (in milliseconds)
   */
  getTimeRemaining: (): number => {
    const session = secureSession.get();
    if (!session) return 0;

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
  },
};

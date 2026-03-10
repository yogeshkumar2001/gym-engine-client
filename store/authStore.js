import { create } from 'zustand';
import Cookies from 'js-cookie';

// secure: true ensures cookies are only sent over HTTPS in production.
// httpOnly cannot be set client-side (requires server-Set-Cookie header) —
// known tradeoff for a fully client-side Next.js auth flow.
const COOKIE_OPTS = {
  expires: 7,
  sameSite: 'strict',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

const useAuthStore = create((set) => ({
  token: null,
  role: null,   // 'owner' | 'admin'
  gymId: null,
  initialized: false,

  init() {
    const token = Cookies.get('gym_token');
    const role = Cookies.get('gym_role');
    const gymId = Cookies.get('gym_id');
    set({ token, role, gymId: gymId ? parseInt(gymId, 10) : null, initialized: true });
  },

  setOwner(token, gymId) {
    Cookies.set('gym_token', token, COOKIE_OPTS);
    Cookies.set('gym_role', 'owner', COOKIE_OPTS);
    Cookies.set('gym_id', String(gymId), COOKIE_OPTS);
    set({ token, role: 'owner', gymId });
  },

  setAdmin(key) {
    Cookies.set('admin_key', key, COOKIE_OPTS);
    Cookies.set('gym_role', 'admin', COOKIE_OPTS);
    set({ role: 'admin' });
  },

  logout() {
    ['gym_token', 'gym_role', 'gym_id', 'admin_key'].forEach((k) => Cookies.remove(k));
    set({ token: null, role: null, gymId: null });
  },
}));

export default useAuthStore;

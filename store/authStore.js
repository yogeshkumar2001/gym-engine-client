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
  role: null,
  gymId: null,
  gymIds: null,
  activeGymId: null,
  initialized: false,

  init() {
    const token = Cookies.get('gym_token');
    const role  = Cookies.get('gym_role');
    const legacyGymId = Cookies.get('gym_id');
    const activeRaw   = Cookies.get('active_gym_id');
    const activeGymId = activeRaw
      ? parseInt(activeRaw, 10)
      : legacyGymId ? parseInt(legacyGymId, 10) : null;

    let gymIds = null;
    try {
      const raw = Cookies.get('gym_ids');
      gymIds = raw ? JSON.parse(raw) : null;
    } catch (_) { gymIds = null; }

    set({ token, role, gymId: activeGymId, gymIds, activeGymId, initialized: true });
  },

  setOwner(token, gymId, gymIds) {
    const ids = Array.isArray(gymIds) && gymIds.length > 0 ? gymIds : [gymId];
    Cookies.set('gym_token',    token,              COOKIE_OPTS);
    Cookies.set('gym_role',     'owner',            COOKIE_OPTS);
    Cookies.set('gym_id',       String(gymId),      COOKIE_OPTS);
    Cookies.set('active_gym_id', String(gymId),     COOKIE_OPTS);
    Cookies.set('gym_ids',      JSON.stringify(ids), COOKIE_OPTS);
    set({ token, role: 'owner', gymId, gymIds: ids, activeGymId: gymId });
  },

  switchGym(gymId) {
    Cookies.set('active_gym_id', String(gymId), COOKIE_OPTS);
    Cookies.set('gym_id',        String(gymId), COOKIE_OPTS);
    set({ gymId, activeGymId: gymId });
  },

  setAdmin(key) {
    Cookies.set('admin_key', key, COOKIE_OPTS);
    Cookies.set('gym_role',  'admin', COOKIE_OPTS);
    set({ role: 'admin' });
  },

  logout() {
    ['gym_token', 'gym_role', 'gym_id', 'active_gym_id', 'gym_ids', 'admin_key']
      .forEach((k) => Cookies.remove(k));
    set({ token: null, role: null, gymId: null, gymIds: null, activeGymId: null });
  },
}));

export default useAuthStore;

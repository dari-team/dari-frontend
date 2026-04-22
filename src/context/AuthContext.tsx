import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  AUTH_UNAUTHORIZED_EVENT,
  TOKEN_KEY,
  USER_KEY,
  type UpdateProfilePayload,
} from "../lib/api";
import { uiUserFromProfile, type StoredUser } from "../lib/userTypeMap";

export interface LoginResult {
  ok: boolean;
  requiresVerification?: boolean;
  // Google sign-in may return this when the email is unknown — the caller
  // should navigate to /complete-profile with { idToken, email, name } in state.
  needsProfile?: { idToken: string; email: string; name: string };
  error?: string;
}

interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean; // true while rehydrating profile on first mount
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithGoogle: (idToken: string) => Promise<LoginResult>;
  completeGoogleProfile: (payload: {
    idToken: string;
    userType: 0 | 1 | 2;
    customerType?: 0 | 1 | null;
    listerType?: 0 | 1 | null;
    agencyName?: string | null;
    licenseNumber?: string | null;
    phoneNumber?: string | null;
  }) => Promise<LoginResult>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ ok: boolean; error?: string }>;
  // Called after register flow succeeds — no-op for now (user must verify email first).
  // Login page will be where the real session starts.
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]   = useState<StoredUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem(TOKEN_KEY));

  // On first mount, if we have a token, refresh the profile so stale cached
  // user data gets corrected. If the token is invalid, the interceptor will
  // fire AUTH_UNAUTHORIZED_EVENT and we'll clear state below.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getProfile()
      .then((res) => {
        if (cancelled) return;
        const u = uiUserFromProfile(res.data);
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        // Interceptor already handled 401 cleanup; just stop loading.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global listener: interceptor dispatches this when a 401 invalidates the session.
  useEffect(() => {
    const onUnauth = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauth);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauth);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await authApi.login(email, password);
      const { token: newToken } = res.data;
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);

      // Fetch full profile so we have phone / userType / etc. in one place.
      const prof = await authApi.getProfile();
      const u = uiUserFromProfile(prof.data);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg = typeof data === "string" ? data : err?.message ?? "Login failed";
      if (status === 401 && typeof data === "string" && /verify your email/i.test(data)) {
        return { ok: false, requiresVerification: true, error: msg };
      }
      return { ok: false, error: msg };
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<LoginResult> => {
    try {
      const res = await authApi.googleLogin(idToken);
      const data = res.data as any;

      // New user — backend asks frontend to collect account-type info first.
      if (data?.needsProfile === true) {
        return {
          ok: false,
          needsProfile: { idToken, email: String(data.email ?? ""), name: String(data.name ?? "") },
        };
      }

      // Existing user — backend returned { token, email, name, role }.
      const jwt = data?.token;
      if (!jwt) return { ok: false, error: "No token returned from server." };

      localStorage.setItem(TOKEN_KEY, jwt);
      setToken(jwt);

      const prof = await authApi.getProfile();
      const u = uiUserFromProfile(prof.data);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = typeof data === "string" ? data : err?.message ?? "Google sign-in failed";
      return { ok: false, error: msg };
    }
  }, []);

  const completeGoogleProfile = useCallback(
    async (payload: Parameters<typeof authApi.googleComplete>[0]): Promise<LoginResult> => {
      try {
        const res = await authApi.googleComplete(payload);
        localStorage.setItem(TOKEN_KEY, res.data.token);
        setToken(res.data.token);
        const prof = await authApi.getProfile();
        const u = uiUserFromProfile(prof.data);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      } catch (err: any) {
        const data = err?.response?.data;
        const msg = typeof data === "string" ? data : err?.message ?? "Could not complete sign-up";
        return { ok: false, error: msg };
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const res = await authApi.getProfile();
    const u = uiUserFromProfile(res.data);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      try {
        await authApi.updateProfile(payload);
        await refreshProfile();
        return { ok: true as const };
      } catch (err: any) {
        const data = err?.response?.data;
        const msg = typeof data === "string" ? data : err?.message ?? "Update failed";
        return { ok: false as const, error: msg };
      }
    },
    [refreshProfile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading,
      login,
      loginWithGoogle,
      completeGoogleProfile,
      logout,
      refreshProfile,
      updateProfile,
    }),
    [user, token, loading, login, loginWithGoogle, completeGoogleProfile, logout, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

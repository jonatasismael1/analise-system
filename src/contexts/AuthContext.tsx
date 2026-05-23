import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { SUPER_ADMIN_EMAIL, GESTOR_CLINIC_KEY } from "../lib/appConfig";
import type { Database } from "../types/database";
import type { ClinicUser, UserRole } from "../types/clinic";

type Clinic = Database["public"]["Tables"]["clinicas"]["Row"];
type UserRow = Database["public"]["Tables"]["usuarios"]["Row"];

interface ClinicContextPayload {
  clinic: Clinic | null;
  profile: UserRow | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  clinic: Clinic | null;
  profile: ClinicUser | null;
  role: UserRole | null;
  loading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshClinic: () => Promise<void>;
  registerClinic: (email: string, password: string, clinicName: string) => Promise<{ error?: string }>;
  setSuperAdminClinic: (clinic: Clinic | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [profile, setProfile] = useState<ClinicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 12000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Tempo excedido ao carregar dados da clínica.")), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const applyClinicContext = (payload: ClinicContextPayload | null) => {
    if (!payload?.clinic) {
      setClinic(null);
      setProfile(null);
      return;
    }

    setClinic(payload.clinic);
    if (!payload.profile) {
      setProfile(null);
      return;
    }

    setProfile({
      id: payload.profile.id,
      clinicaId: payload.profile.clinica_id,
      userId: payload.profile.user_id,
      profissionalId: payload.profile.profissional_id,
      nome: payload.profile.nome,
      email: payload.profile.email,
      role: payload.profile.role as UserRole,
      ativo: payload.profile.ativo
    });
  };

  // Carrega dados da clínica. Para super-admin, restaura a clínica selecionada do sessionStorage.
  const loadClinicData = async (userEmail?: string) => {
    try {
      if (userEmail === SUPER_ADMIN_EMAIL) {
        const selectedId = sessionStorage.getItem(GESTOR_CLINIC_KEY);
        if (selectedId) {
          const { data } = await supabase.rpc("get_clinic_by_id_super_admin", { p_clinic_id: selectedId });
          const rows = data as Clinic[] | null;
          if (rows && rows.length > 0) {
            setClinic(rows[0]);
            setProfile(null);
            return;
          }
        }
        setClinic(null);
        setProfile(null);
        return;
      }

      const { data, error } = await withTimeout(Promise.resolve(supabase.rpc("get_my_clinic_context")));
      if (error) throw error;
      applyClinicContext(data as ClinicContextPayload | null);
    } catch (err) {
      console.error("Error loading clinic context:", err);
      setClinic(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        if (initialSession?.user) {
          await loadClinicData(initialSession.user.email ?? undefined);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          isInitialLoad.current = false;
        }
      }
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (event === "SIGNED_OUT") {
        setClinic(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // SIGNED_IN e TOKEN_REFRESHED: recarrega dados da clínica silenciosamente,
      // sem setLoading(true), para não desmontar a página e perder estado de formulários.
      // O carregamento inicial já é feito por initialize() acima.
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && nextSession?.user) {
        if (!isInitialLoad.current) {
          void loadClinicData(nextSession.user.email ?? undefined);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isSuperAdmin = !!(session?.user?.email === SUPER_ADMIN_EMAIL);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    clinic,
    profile,
    // Super-admin acessando uma clínica selecionada sempre recebe role "admin"
    role: isSuperAdmin
      ? (clinic ? ("admin" as UserRole) : null)
      : (profile?.role ?? (clinic?.user_id && clinic.user_id === session?.user?.id ? "admin" : null)),
    loading,
    isSuperAdmin,

    setSuperAdminClinic(selectedClinic: Clinic | null) {
      if (selectedClinic) {
        sessionStorage.setItem(GESTOR_CLINIC_KEY, selectedClinic.id);
      } else {
        sessionStorage.removeItem(GESTOR_CLINIC_KEY);
      }
      setClinic(selectedClinic);
      setProfile(null);
    },

    async login(email, password) {
      setLoading(true);
      try {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          await loadClinicData(data.user.email ?? undefined);
        }
        return {};
      } catch (err: any) {
        return { error: err.message };
      } finally {
        setLoading(false);
      }
    },

    async logout() {
      setLoading(true);
      try {
        sessionStorage.removeItem(GESTOR_CLINIC_KEY);
        await supabase.auth.signOut();
      } finally {
        setSession(null);
        setClinic(null);
        setProfile(null);
        setLoading(false);
      }
    },

    async registerClinic(email, password, clinicName) {
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return { error: authError.message };
        if (!authData.user) return { error: "Falha ao criar usuário." };

        const slug = clinicName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

        const { error: clinicError } = await supabase.from("clinicas").insert({
          nome: clinicName,
          slug,
          email,
          user_id: authData.user.id
        });

        if (clinicError) return { error: clinicError.message };

        await loadClinicData(authData.user.email ?? undefined);
        return {};
      } catch (err: any) {
        return { error: err.message };
      } finally {
        setLoading(false);
      }
    },

    async refreshClinic() {
      if (session?.user) {
        setLoading(true);
        await loadClinicData(session.user.email ?? undefined);
        setLoading(false);
      }
    }
  }), [clinic, loading, profile, session, isSuperAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

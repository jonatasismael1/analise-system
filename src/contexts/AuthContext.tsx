import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
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
  role: UserRole;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshClinic: () => Promise<void>;
  registerClinic: (email: string, password: string, clinicName: string) => Promise<{ error?: string }>;
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
      timeoutId = setTimeout(() => reject(new Error("Tempo excedido ao carregar dados da clinica.")), timeoutMs);
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

  const loadClinicData = async () => {
    try {
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
          await loadClinicData();
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

      if (event === "SIGNED_IN" && nextSession?.user) {
        setTimeout(() => {
          if (!mounted) return;
          setLoading(true);
          void loadClinicData().finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else if (event === "SIGNED_OUT") {
        setClinic(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    clinic,
    profile,
    role: profile?.role ?? "admin",
    loading,
    async login(email, password) {
      setLoading(true);
      try {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          await loadClinicData();
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
        // 1. SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return { error: authError.message };
        if (!authData.user) return { error: "Falha ao criar usuário." };

        // 2. Create Clinic
        const slug = clinicName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        
        const { error: clinicError } = await supabase.from("clinicas").insert({
          nome: clinicName,
          slug,
          email,
          user_id: authData.user.id
        });

        if (clinicError) return { error: clinicError.message };

        // 3. Load clinic data immediately
        await loadClinicData();
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
        await loadClinicData();
        setLoading(false);
      }
    }
  }), [clinic, loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Database } from "../types/database";
import type { ClinicUser, UserRole } from "../types/clinic";

type Clinic = Database["public"]["Tables"]["clinicas"]["Row"];

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

  async function loadClinic(userId: string) {
    const owner = await supabase.from("clinicas").select("*").eq("user_id", userId).maybeSingle();
    if (owner.data) {
      setClinic(owner.data);
      setProfile(null);
      return;
    }

    const access = await supabase.from("usuarios").select("*").eq("user_id", userId).eq("ativo", true).maybeSingle();
    if (access.data) {
      const clinicRes = await supabase.from("clinicas").select("*").eq("id", access.data.clinica_id).maybeSingle();
      setClinic(clinicRes.data ?? null);
      setProfile({
        id: access.data.id,
        clinicaId: access.data.clinica_id,
        userId: access.data.user_id,
        profissionalId: access.data.profissional_id,
        nome: access.data.nome,
        email: access.data.email,
        role: access.data.role as UserRole,
        ativo: access.data.ativo
      });
      return;
    }

    if (owner.error || access.error) {
      setClinic(null);
      setProfile(null);
      return;
    }
    setClinic(null);
    setProfile(null);
  }

  async function refreshClinic() {
    const { data } = await supabase.auth.getUser();
    if (data.user) await loadClinic(data.user.id);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadClinic(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadClinic(nextSession.user.id);
      } else {
        setClinic(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    async logout() {
      await supabase.auth.signOut();
      setSession(null);
      setClinic(null);
      setProfile(null);
    },
    async registerClinic(email, password, clinicName) {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) return { error: authError.message };
      if (!authData.user) return { error: "Erro ao criar usuário." };

      const slug = clinicName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      
      const { error: clinicError } = await supabase.from("clinicas").insert({
        nome: clinicName,
        slug,
        email,
        user_id: authData.user.id
      });

      if (clinicError) return { error: clinicError.message };
      return {};
    },
    refreshClinic
  }), [clinic, loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

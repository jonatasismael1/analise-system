import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useRef } from "react";
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
  const isInitialLoad = useRef(true);

  const loadClinicData = async (userId: string) => {
    try {
      // 1. Check if user is an owner
      const { data: owner, error: ownerError } = await supabase
        .from("clinicas")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (owner) {
        setClinic(owner);
        setProfile(null);
        return;
      }

      // 2. Check if user is a staff member
      const { data: access, error: accessError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", userId)
        .eq("ativo", true)
        .maybeSingle();

      if (access) {
        const { data: clinicRes } = await supabase
          .from("clinicas")
          .select("*")
          .eq("id", access.clinica_id)
          .maybeSingle();

        setClinic(clinicRes ?? null);
        setProfile({
          id: access.id,
          clinicaId: access.clinica_id,
          userId: access.user_id,
          profissionalId: access.profissional_id,
          nome: access.nome,
          email: access.email,
          role: access.role as UserRole,
          ativo: access.ativo
        });
        return;
      }

      setClinic(null);
      setProfile(null);
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
          await loadClinicData(initialSession.user.id);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (event === "SIGNED_IN") {
        if (nextSession?.user) {
          setLoading(true);
          await loadClinicData(nextSession.user.id);
          setLoading(false);
        }
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
          await loadClinicData(data.user.id);
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
        await loadClinicData(authData.user.id);
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
        await loadClinicData(session.user.id);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Role = "admin" | "profissional" | "secretaria";

export interface FunctionContext {
  userId: string;
  role: Role;
  supabaseAdmin: ReturnType<typeof createClient>;
}

export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function getFunctionContext(req: Request, clinicId: string): Promise<FunctionContext> {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data.user) throw new Response(JSON.stringify({ error: "Usuario nao autenticado." }), { status: 401 });

  const { data: ownerClinic } = await supabaseAdmin
    .from("clinicas")
    .select("id")
    .eq("id", clinicId)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (ownerClinic) {
    return { userId: data.user.id, role: "admin", supabaseAdmin };
  }

  const { data: profile } = await supabaseAdmin
    .from("usuarios")
    .select("role")
    .eq("clinica_id", clinicId)
    .eq("user_id", data.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!profile?.role) throw new Response(JSON.stringify({ error: "Acesso negado." }), { status: 403 });

  return { userId: data.user.id, role: profile.role as Role, supabaseAdmin };
}

export function assertStaff(role: Role) {
  if (!["admin", "secretaria"].includes(role)) {
    throw new Response(JSON.stringify({ error: "Acesso restrito a administracao e secretaria." }), { status: 403 });
  }
}


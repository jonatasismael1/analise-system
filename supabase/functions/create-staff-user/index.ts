import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Role = "admin" | "profissional" | "secretaria";

interface Payload {
  clinicaId: string;
  nome: string;
  email: string;
  password: string;
  role: Role;
  profissionalId?: string | null;
  professional?: {
    especialidade?: string;
    telefone?: string | null;
    registro?: string | null;
    conselho?: string | null;
    fotoUrl?: string | null;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Variáveis de ambiente do Supabase ausentes." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Usuário não autenticado." }, 401);
  }

  const payload = await req.json() as Payload;
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role;

  if (!payload.clinicaId || !payload.nome?.trim() || !email || !payload.password || !["admin", "profissional", "secretaria"].includes(role)) {
    return json({ error: "Dados obrigatórios inválidos." }, 400);
  }

  if (payload.password.length < 8) {
    return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
  }

  const { data: ownerClinic } = await supabaseAdmin
    .from("clinicas")
    .select("id")
    .eq("id", payload.clinicaId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const { data: requester } = await supabaseAdmin
    .from("usuarios")
    .select("role")
    .eq("clinica_id", payload.clinicaId)
    .eq("user_id", authData.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!ownerClinic && requester?.role !== "admin") {
    return json({ error: "Somente administradores podem criar acessos." }, 403);
  }

  let profissionalId = payload.profissionalId ?? null;
  if (role === "profissional" && !profissionalId) {
    const { data: professional, error: professionalError } = await supabaseAdmin
      .from("profissionais")
      .insert({
        clinica_id: payload.clinicaId,
        nome: payload.nome.trim(),
        especialidade: payload.professional?.especialidade ?? "Profissional",
        email,
        telefone: payload.professional?.telefone ?? null,
        registro: payload.professional?.registro ?? null,
        conselho: payload.professional?.conselho ?? null,
        foto_url: payload.professional?.fotoUrl ?? null,
        ativo: true
      })
      .select("id")
      .single();

    if (professionalError) {
      return json({ error: professionalError.message }, 400);
    }
    profissionalId = professional.id;
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      nome: payload.nome.trim(),
      role
    }
  });

  if (createUserError || !createdUser.user) {
    return json({ error: createUserError?.message ?? "Não foi possível criar o usuário." }, 400);
  }

  const { error: profileError } = await supabaseAdmin
    .from("usuarios")
    .upsert({
      clinica_id: payload.clinicaId,
      user_id: createdUser.user.id,
      profissional_id: profissionalId,
      nome: payload.nome.trim(),
      email,
      role,
      ativo: true
    }, { onConflict: "clinica_id,email" });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return json({ error: profileError.message }, 400);
  }

  return json({
    message: "Usuário criado e vinculado à clínica.",
    userId: createdUser.user.id,
    profissionalId
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

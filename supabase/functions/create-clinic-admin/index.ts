import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "contato.ismao@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface Payload {
  clinicaNome: string;
  adminNome: string;
  adminEmail: string;
  adminPassword: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !authData.user) return json({ error: "Não autenticado." }, 401);
  if (authData.user.email !== SUPER_ADMIN_EMAIL) return json({ error: "Acesso negado: apenas o gestor geral pode criar clínicas." }, 403);

  const payload = await req.json() as Payload;
  const { clinicaNome, adminNome, adminEmail, adminPassword } = payload;

  if (!clinicaNome?.trim() || !adminNome?.trim() || !adminEmail?.trim() || !adminPassword) {
    return json({ error: "Todos os campos são obrigatórios." }, 400);
  }
  if (adminPassword.length < 8) {
    return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
  }

  // 1. Criar o usuário admin no Auth
  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail.trim().toLowerCase(),
    password: adminPassword,
    email_confirm: true,
    user_metadata: { nome: adminNome.trim(), role: "admin" }
  });
  if (createUserError || !createdUser.user) {
    return json({ error: createUserError?.message ?? "Erro ao criar usuário." }, 400);
  }
  const userId = createdUser.user.id;

  // 2. Criar a clínica com user_id apontando para o novo admin
  const slug = clinicaNome.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    + "-" + Date.now().toString(36);

  const { data: clinica, error: clinicaError } = await supabaseAdmin
    .from("clinicas")
    .insert({ nome: clinicaNome.trim(), slug, email: adminEmail.trim().toLowerCase(), user_id: userId })
    .select("id")
    .single();

  if (clinicaError || !clinica) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return json({ error: clinicaError?.message ?? "Erro ao criar clínica." }, 400);
  }

  // 3. Criar o registro na tabela usuarios
  const { error: profileError } = await supabaseAdmin
    .from("usuarios")
    .insert({
      clinica_id: clinica.id,
      user_id: userId,
      nome: adminNome.trim(),
      email: adminEmail.trim().toLowerCase(),
      role: "admin",
      ativo: true
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("clinicas").delete().eq("id", clinica.id);
    return json({ error: profileError.message }, 400);
  }

  return json({ message: "Clínica e admin criados com sucesso.", clinicaId: clinica.id, userId });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

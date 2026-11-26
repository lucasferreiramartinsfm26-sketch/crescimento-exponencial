import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return jsonResponse({ error: "Sessão não encontrada. Entre novamente." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE_MY_ACCOUNT") {
      return jsonResponse({ error: "Confirmação obrigatória não informada." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("delete-account: configuração segura do servidor incompleta.");
      return jsonResponse({ error: "Serviço temporariamente indisponível. Entre em contato com o suporte." }, 500);
    }

    // A chave administrativa fica somente no servidor. O JWT recebido é
    // validado pelo Auth antes de qualquer operação administrativa.
    const authClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Sessão inválida ou expirada. Entre novamente." }, 401);
    }

    const { error: deleteError } = await authClient.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      console.error("delete-account: falha ao excluir usuário:", deleteError.message);
      return jsonResponse({ error: "Não foi possível excluir a conta. Entre em contato com o suporte." }, 500);
    }

    return jsonResponse({ success: true, message: "Conta excluída." });
  } catch (error) {
    console.error("delete-account: erro inesperado:", error);
    return jsonResponse({ error: "Não foi possível excluir a conta. Entre em contato com o suporte." }, 500);
  }
});

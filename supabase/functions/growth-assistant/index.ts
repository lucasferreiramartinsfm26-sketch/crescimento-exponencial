const allowedOrigin = "https://lucasferreiramartinsfm26-sketch.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return jsonResponse({ error: "Origem não autorizada." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return jsonResponse({ error: "Entre na sua conta para usar a assistente." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !anonKey || !openAiKey) {
      return jsonResponse({ error: "A assistente ainda não foi configurada no servidor. É necessário cadastrar a chave de IA e publicar a função." }, 503);
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData.user) return jsonResponse({ error: "Sessão inválida. Entre novamente." }, 401);

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
      return jsonResponse({ error: "Envie uma conversa válida." }, 400);
    }
    const messages = body.messages.map((item: { role?: string; content?: string }) => {
      if (!["user", "assistant"].includes(item?.role || "") || typeof item.content !== "string") throw new Error("Mensagem inválida.");
      return { role: item.role, content: item.content.slice(0, 2000) };
    });
    const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 80).map((task: Record<string, unknown>) => ({
      title: String(task.title || "").slice(0, 160),
      category: task.category === "Meta" ? "Meta" : "Tarefa",
      done: Boolean(task.done),
      priority: String(task.priority || "Média").slice(0, 20),
      due_date: task.due_date ? String(task.due_date).slice(0, 10) : null,
      progress: Math.max(0, Math.min(100, Number(task.progress) || 0)),
    })) : [];

    const systemPrompt = `Você é a Crescimento IA, assistente do aplicativo Crescimento Exponencial. Responda em português brasileiro, com clareza, acolhimento e foco em ações práticas. Ajude com organização de tarefas, metas, produtividade, estudos, carreira e educação financeira básica. Use o contexto de tarefas do usuário somente para ajudá-lo a planejar; não afirme que alterou ou salvou tarefas no aplicativo. Se pedirem para criar/alterar itens, forneça um plano e explique que o usuário deve cadastrá-los na área de tarefas. Em finanças, ajude com orçamento, controle de gastos e poupança; não prometa retornos nem recomende ativos específicos como garantia. Não solicite senhas, dados bancários ou informações sensíveis. Não invente informações. Contexto atual das tarefas do usuário (dados fornecidos pelo próprio app): ${JSON.stringify(tasks)}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.6,
        max_tokens: 800,
      }),
    });
    if (!response.ok) {
      console.error("growth-assistant provider error:", response.status);
      return jsonResponse({ error: "A IA está temporariamente indisponível. Tente novamente em instantes." }, 502);
    }
    const result = await response.json();
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return jsonResponse({ error: "Não foi possível gerar uma resposta." }, 502);
    return jsonResponse({ reply: reply.trim() });
  } catch (error) {
    console.error("growth-assistant error:", error);
    return jsonResponse({ error: "Não foi possível processar sua mensagem." }, 500);
  }
});

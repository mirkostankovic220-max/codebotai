import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const API_HOST = "https://openrouter.ai/api/v1/chat/completions";
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Check if any message contains an image
    const hasImage = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
    );

    const systemPrompt = hasImage
      ? `You are an expert coding assistant with image analysis capabilities. When a user sends an image:
- Analyze the image thoroughly and describe what you see
- If it's code/UI screenshot, identify the technologies, patterns, and suggest improvements
- If it's a design mockup, describe the layout and suggest how to implement it
- If it's an error/bug screenshot, identify the issue and provide a fix
- If it's a diagram or architecture, explain the structure
- Always relate your analysis back to coding and development when possible

When providing code:
- Always use proper code blocks with language identifiers
- Explain your code clearly
- Provide best practices and optimizations`
      : `You are an expert coding assistant. You help users write, debug, and understand code.

When providing code:
- Always use proper code blocks with language identifiers (e.g., \`\`\`javascript, \`\`\`python, \`\`\`html, etc.)
- Explain your code clearly
- Provide best practices and optimizations
- Be concise but thorough

You specialize in:
- Web development (HTML, CSS, JavaScript, TypeScript, React, Vue, Angular)
- Backend development (Node.js, Python, Java, Go)
- Database queries (SQL, MongoDB)
- DevOps and scripting
- Algorithm design and optimization

Always format code properly for easy copying.`;

    // Free models get rate limited often — rotate through fallbacks.
    const MODELS = [
      "qwen/qwen3.8-27b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemma-3-27b-it:free",
      "mistralai/mistral-small-3.2-24b-instruct:free",
      "deepseek/deepseek-chat-v3.1:free",
    ];

    let response: Response | null = null;
    let lastStatus = 0;
    let lastError = "";

    for (const model of MODELS) {
      const attempt = await fetch(API_HOST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codebotai.lovable.app",
          "X-Title": "CoderAi v2.0",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (attempt.ok) {
        response = attempt;
        break;
      }

      lastStatus = attempt.status;
      lastError = await attempt.text();
      console.error(`Model ${model} failed:`, attempt.status, lastError);

      // Only rotate on capacity/limit/availability errors
      if (![402, 404, 429, 500, 502, 503].includes(attempt.status)) break;
    }

    if (!response) {
      if (lastStatus === 429) {
        return new Response(
          JSON.stringify({ error: "All free models are busy right now. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (lastStatus === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

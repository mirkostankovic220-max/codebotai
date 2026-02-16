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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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

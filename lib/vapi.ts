const VAPI_URL = "https://api.vapi.ai";

export async function createVapiAgent(name: string, greeting: string) {
  const res = await fetch(`${VAPI_URL}/assistant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      firstMessage: greeting,
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an AI receptionist named ${name}. Be professional and helpful.`,
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Vapi Error: ${res.statusText}`);
  }

  return res.json();
}


export async function createVapiAssistant(agent: {
  name: string;
  greeting: string;
  tone: string;
  language: string;
  faqs: { question: string; answer: string }[];
  phoneNumber?: string;
  businessName?: string;
}) {
  const faqText =
    agent.faqs.length > 0
      ? "\n\nYou have been trained on the following FAQs:\n" +
        agent.faqs
          .filter((f) => f.question && f.answer)
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join("\n\n")
      : "";
 
  const toneInstruction =
    agent.tone === "professional"
      ? "Maintain a formal, precise, and business-focused tone at all times."
      : agent.tone === "casual"
      ? "Keep the conversation relaxed, friendly, and easy-going."
      : "Be warm, approachable, and conversational.";
 
  const systemPrompt = `You are ${agent.name}, an AI receptionist. ${toneInstruction}
 
Your job is to:
- Greet callers warmly and professionally
- Answer questions about the business accurately using the FAQs provided
- Help callers book appointments when requested
- Take messages when appropriate
- Transfer calls to a human agent when the caller specifically requests it or when you cannot help
 
Always be concise — callers are on the phone. Never make up information. If you don't know, say so politely.${faqText}`;
 
  const languageCode =
    agent.language.toLowerCase().includes("spanish") ? "es" :
    agent.language.toLowerCase().includes("french") ? "fr" :
    agent.language.toLowerCase().includes("german") ? "de" :
    agent.language.toLowerCase().includes("portuguese") ? "pt" :
    agent.language.toLowerCase().includes("mandarin") ? "zh" :
    "en";
 
  const body: Record<string, unknown> = {
    name: agent.name,
    firstMessage: agent.greeting,
    transcriber: {
      provider: "deepgram",
      language: languageCode,
    },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.4,
    },
    voice: {
      provider: "11labs",
      voiceId: "sarah", // default female voice
    },
    endCallFunctionEnabled: true,
    endCallMessage: "Thank you for calling. Have a wonderful day!",
  };
 
  const res = await fetch(`${VAPI_URL}/assistant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
 
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi assistant creation failed: ${err}`);
  }
 
  return res.json() as Promise<{ id: string; [key: string]: unknown }>;
}
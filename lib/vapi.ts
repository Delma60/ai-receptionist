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

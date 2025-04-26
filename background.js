chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "classify_material") {
    //const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const prompt = `Classify the material description into one or more of these categories:
    - biodegradable
    - plastic
    - eco-friendly
    - natural
    - glass
    - metal
    - other

    Description: "${message.text}"

    Respond in JSON format like: {"categories": ["biodegradable", "eco-friendly"]}`;

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that classifies material types based on product descriptions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      })
    })
    .then(res => res.json())
    .then(data => {
      const text = data.choices[0].message.content;
      try {
        const parsed = JSON.parse(text);
        sendResponse({ data: parsed });
      } catch (e) {
        sendResponse({ error: "Failed to parse JSON: " + text });
      }
    })
    .catch(error => sendResponse({ error: error.message }));

    return true; // Keep async response alive
  }
});

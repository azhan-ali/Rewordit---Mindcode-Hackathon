const GEMINI_API_KEY = "YOUR_API_KEY_HERE";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze_text') {
        analyzeText(request.text)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function analyzeText(text) {
    const prompt = `Analyze the following text. You must respond with valid JSON ONLY.
Output structure:
{
  "stress_score": <number from 0 to 100 representing how angry or stressed the text is>,
  "emotions": ["array", "of", "strings", "describing", "emotions", "felt"],
  "reworded_options": [
    {
       "tone": "Professional",
       "text": "<A strictly professional, formal, and calm version>"
    },
    {
       "tone": "Direct",
       "text": "<A firm, concise, direct, but not rude version>"
    },
    {
       "tone": "Soft",
       "text": "<An empathetic, gentle, and highly collaborative version>"
    }
  ]
}
Text to analyze: """${text}"""`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: { response_mime_type: "application/json" }
        })
    });

    if (response.status === 429) {
        throw new Error("RATE_LIMIT");
    }
    if (!response.ok) {
        const err = await response.text();
        console.error("API Error details:", err);
        throw new Error('API Request Failed');
    }

    const json = await response.json();
    if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
        console.error("Unexpected structure:", json);
        throw new Error('BLOCKED');
    }

    let resultText = json.candidates[0].content.parts[0].text;

    try {
        return JSON.parse(resultText);
    } catch (e) {
        const match = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            return JSON.parse(match[1]);
        }
        throw new Error('Invalid JSON response from Gemini');
    }
}

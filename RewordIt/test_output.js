const GEMINI_API_KEY = `Put_your_gemini_key_here`;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function testAPI() {
    const texts = [
        "hii azhan this size i see your message it looks so bad and i am very frustrated with u and i just want to say that fuck off",
        "hello world I am just typing a normal message to test out this plugin.",
        "I think things are okay, let's keep working on it."
    ];

    const prompt = (text) => `Analyze the following text. You must respond with valid JSON ONLY.
Output structure:
{
  "stress_score": <number from 0 to 100 representing how angry or stressed the text -is>,
  "emotions": ["array", "of", "strings", "describing", "emotions", "felt"],
  "reworded": "<a calmer, more professional rewrite of the text if it's over 50 stress. If under 50, provide a slightly polished version.>"
}
Text to analyze: """${text}"""`;

    for (let i = 0; i < texts.length; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt(texts[i]) }] }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });
            const json = await response.json();
            if (!json.candidates || !json.candidates[0].content) {
                console.error(`Error for text ${i + 1}: missing candidates. JSON:`, JSON.stringify(json, null, 2));
                continue;
            }
            const res = JSON.parse(json.candidates[0].content.parts[0].text);
            console.log(`Text ${i + 1}: stress_score = ${res.stress_score}`);
        } catch (e) {
            console.error(`Catch error for text ${i + 1}:`, e);
        }
    }
}
testAPI();
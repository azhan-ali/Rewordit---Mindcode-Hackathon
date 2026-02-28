const GEMINI_API_KEY = "AIzaSyAaOzQuzM2jGh7-dZlAKuVsqqi37TwLIfE";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function testAPI() {
    const text = "hii i want to say that i am not work with u u are really very bad boss and from now i give resign so fuck off";

    const prompt = `Analyze the following text. You must respond with valid JSON ONLY.
Output structure:
{
  "stress_score": <number from 0 to 100 representing how angry or stressed the text is>,
  "emotions": ["array", "of", "strings", "describing", "emotions", "felt"],
  "reworded": "<a calmer, more professional rewrite of the text if it's over 50 stress. If under 50, provide a slightly polished version.>"
}
Text to analyze: """${text}"""`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });
        console.log("Status:", response.status);
        const textOut = await response.text();
        console.log(textOut);
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
testAPI();

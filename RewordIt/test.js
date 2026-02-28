const GEMINI_API_KEY = "AIzaSyCJKF9BAFTgoVp6lWYymsghG-NdxqV5WUQ";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

async function testAPI() {
    const text = "hii azhan side i see ur message and i dont like the way u told me i am totally disagree with it so i want to say one thing fuck off";
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        console.log("Status:", response.status);
        const json = await response.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}
testAPI();

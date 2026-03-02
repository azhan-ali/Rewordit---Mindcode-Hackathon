const GEMINI_API_KEY = "Put_Your_GEMINI_API_KEY";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

async function testAPI() {
    try {
        const response = await fetch(url);
        const json = await response.json();
        console.log(json.models.map(m => m.name).join("\n"));
    } catch (e) {
        console.error(e);
    }
}
testAPI();

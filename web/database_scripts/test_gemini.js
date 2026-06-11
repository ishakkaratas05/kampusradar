async function test() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "API_KEY_HERE";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();

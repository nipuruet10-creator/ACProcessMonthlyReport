/**
 * Process Development Monthly Report Automation System
 * Module: GeminiService - Server-side Gemini 3.8 Flash Endpoint
 * WALTON Hi-Tech Industries PLC
 */

const GeminiService = {
  getApiKey() {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
  },

  generateReportContent(payload) {
    // payload: { task_name, task_details, impact }
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        ai_report_title: payload.task_name,
        ai_report_description: payload.task_details,
        ai_report_impact: payload.impact,
        cached: false,
        note: "Gemini API key not set in Script Properties. Using original fields."
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `You are the lead engineering report editor for Walton AC Process Development Department.
Rewrite the following engineering task into concise executive monthly report fields.
STRICT RULE: Do NOT invent or fabricate any technical facts, numbers, dates, savings, or percentages. Use ONLY the provided information.

Original Task Name: "${payload.task_name}"
Original Task Details: "${payload.task_details}"
Original Impact: "${payload.impact}"

Respond with ONLY a valid JSON object matching this exact schema:
{
  "ai_report_title": "concise professional report title (max 10 words)",
  "ai_report_description": "short, clear, management-friendly description (1-2 sentences)",
  "ai_report_impact": "concise bulleted impact points separated by semicolons"
}`;

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
      }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      const rawText = result.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    }

    throw new Error("Failed to generate content from Gemini API");
  }
};

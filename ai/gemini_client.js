/**
 * Process Development Monthly Report Automation System
 * Module: Gemini AI Client
 * Communicates with Gemini 3.8 Flash / Generative Language API
 * WALTON Hi-Tech Industries PLC
 */

class GeminiClient {
  constructor(config = APP_CONFIG.AI) {
    this.config = config;
    this.cache = typeof AICacheManager !== 'undefined' ? AICacheManager : null;
    this.templates = typeof PROMPT_TEMPLATES !== 'undefined' ? PROMPT_TEMPLATES : null;
  }

  /**
   * Retrieves active Gemini API key from storage
   */
  getApiKey() {
    return HELPERS.storage.get(this.config.STORAGE_KEY_API_KEY, "") || "";
  }

  /**
   * Sets Gemini API key in storage
   */
  setApiKey(key) {
    HELPERS.storage.set(this.config.STORAGE_KEY_API_KEY, (key || "").trim());
  }

  /**
   * Transforms a single task into AI report fields:
   * ai_report_title, ai_description, ai_impact, ai_category, ai_project_type
   * @param {Object} task
   * @param {Boolean} forceRegenerate - If true, bypasses cache
   */
  async transformTask(task, forceRegenerate = false) {
    if (!task) return null;

    // 1. Check cache unless forced
    if (!forceRegenerate) {
      const cached = this.cache.get(task);
      if (cached) {
        return {
          ai_report_title: cached.ai_report_title,
          ai_description: cached.ai_description || cached.ai_report_description,
          ai_impact: cached.ai_impact || cached.ai_report_impact,
          ai_category: cached.ai_category || "Process Development",
          ai_project_type: cached.ai_project_type || "Process Improvement",
          fromCache: true
        };
      }
    }

    // 2. Check if API key is present
    const apiKey = this.getApiKey();
    if (!apiKey) {
      // Use local factual transformation fallback (100% offline & zero hallucination)
      const fallback = this.templates.localFactualTransform(task);
      this.cache.set(task, fallback);
      return { ...fallback, fromCache: false, source: "local_rule" };
    }

    // 3. Invoke Gemini API
    try {
      const prompt = this.templates.buildTaskPrompt(task);
      const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: this.templates.SYSTEM_INSTRUCTION + "\n\n" + prompt }]
          }],
          generationConfig: {
            temperature: this.config.TEMPERATURE,
            maxOutputTokens: this.config.MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);

        const result = {
          ai_report_title: parsed.ai_report_title || task.task_name || task.original_task_name,
          ai_description: parsed.ai_description || parsed.ai_report_description || "",
          ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : (parsed.ai_report_impact ? [parsed.ai_report_impact] : []),
          ai_category: parsed.ai_category || "Process Development",
          ai_project_type: parsed.ai_project_type || "Process Improvement",
          fromCache: false,
          source: "gemini-3.8-flash"
        };

        // Cache the result
        this.cache.set(task, result);
        return result;
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to local factual transformation:", err.message);
      const fallback = this.templates.localFactualTransform(task);
      this.cache.set(task, fallback);
      return { ...fallback, fromCache: false, source: "fallback_after_error", error: err.message };
    }
  }

  /**
   * Batch transforms multiple tasks
   */
  async batchTransformTasks(tasks = [], forceRegenerate = false) {
    const results = [];
    for (const task of tasks) {
      const transformed = await this.transformTask(task, forceRegenerate);
      task.ai_report_title = transformed.ai_report_title;
      task.ai_description = transformed.ai_description;
      task.ai_impact = transformed.ai_impact;
      task.ai_category = transformed.ai_category;
      task.ai_project_type = transformed.ai_project_type;
      results.push(task);
    }
    return results;
  }

  /**
   * Generates 3-4 industrial engineering milestone steps for a task
   * @param {string} taskName
   * @param {string} category
   * @returns {Promise<string>}
   */
  async generateTaskSteps(taskName = "", category = "") {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return this.templates.generateEngineeringSteps(taskName, category);
    }

    try {
      const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${apiKey}`;
      const prompt = `You are an industrial process development engineer at Walton Hi-Tech Industries PLC.
Generate strictly 3 to 4 sequential, realistic engineering steps for this task:
Task: "${taskName}"
Category: "${category}"

Format strictly as a single line: "1. First milestone 2. Second milestone 3. Third milestone 4. Fourth milestone".
Keep it concise, actionable, and suitable for manufacturing plant execution.
Do not use markdown, bullets, or additional commentary.`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text.trim();
        return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      }
      return this.templates.generateEngineeringSteps(taskName, category);
    } catch (err) {
      console.warn("Gemini step generation fallback:", err.message);
      return this.templates.generateEngineeringSteps(taskName, category);
    }
  }
}

const geminiClient = new GeminiClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient, geminiClient };
} else if (typeof window !== 'undefined') {
  window.GeminiClient = GeminiClient;
  window.geminiClient = geminiClient;
}

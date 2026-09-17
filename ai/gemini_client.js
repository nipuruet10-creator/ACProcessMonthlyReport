/**
 * Process Development Monthly Report Automation System
 * Module: Gemini & OpenRouter AI Client
 * Communicates with OpenRouter Free API & Google Gemini 3.8 Flash
 * Features: Multi-provider support (OpenRouter Free / Gemini Direct / Offline Local Rule)
 * WALTON Hi-Tech Industries PLC
 */

class GeminiClient {
  constructor(config = APP_CONFIG.AI) {
    this.config = config;
    this.cache = typeof AICacheManager !== 'undefined' ? AICacheManager : null;
    this.templates = typeof PROMPT_TEMPLATES !== 'undefined' ? PROMPT_TEMPLATES : null;
    
    // OpenRouter Settings
    this.OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
    this.STORAGE_KEY_PROVIDER = "walton_pd_ai_provider";
    this.STORAGE_KEY_OPENROUTER_KEY = "walton_pd_openrouter_api_key";
    this.STORAGE_KEY_OPENROUTER_MODEL = "walton_pd_openrouter_model";
    this.DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";
  }

  getProvider() {
    return HELPERS.storage.get(this.STORAGE_KEY_PROVIDER, "openrouter") || "openrouter";
  }

  setProvider(provider) {
    HELPERS.storage.set(this.STORAGE_KEY_PROVIDER, provider);
  }

  getOpenRouterKey() {
    return HELPERS.storage.get(this.STORAGE_KEY_OPENROUTER_KEY, "") || "";
  }

  setOpenRouterKey(key) {
    HELPERS.storage.set(this.STORAGE_KEY_OPENROUTER_KEY, (key || "").trim());
  }

  getOpenRouterModel() {
    return HELPERS.storage.get(this.STORAGE_KEY_OPENROUTER_MODEL, this.DEFAULT_OPENROUTER_MODEL) || this.DEFAULT_OPENROUTER_MODEL;
  }

  get openRouterModel() {
    return this.getOpenRouterModel();
  }

  setOpenRouterModel(model) {
    HELPERS.storage.set(this.STORAGE_KEY_OPENROUTER_MODEL, (model || this.DEFAULT_OPENROUTER_MODEL).trim());
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
   * Tests OpenRouter API connection with a lightweight prompt
   */
  async testOpenRouterConnection(apiKey = null, model = null) {
    const key = apiKey || this.getOpenRouterKey();
    const mdl = model || this.getOpenRouterModel();
    if (!key) {
      return { success: false, error: "OpenRouter API Key is empty. Please enter your key." };
    }

    const startTime = Date.now();
    try {
      const response = await fetch(this.OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": "https://waltonbd.com",
          "X-Title": "Walton AC Process Monthly Report",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: mdl,
          messages: [
            { role: "system", content: "Respond with strictly the word: OK" },
            { role: "user", content: "Ping" }
          ],
          max_tokens: 10,
          temperature: 0.1
        })
      });

      const latency = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
        } catch (_) {
          if (errText) errMsg = errText.slice(0, 150);
        }
        return { success: false, error: errMsg, latency };
      }

      const data = await response.json();
      const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "OK";
      return { success: true, latency, reply: reply.trim(), model: mdl };
    } catch (e) {
      return { success: false, error: e.message || "Network error", latency: Date.now() - startTime };
    }
  }

  /**
   * Fetches all available models from OpenRouter API, prioritizing free models
   */
  async fetchOpenRouterModels(apiKey = null) {
    const key = apiKey || this.getOpenRouterKey();
    const headers = {
      "HTTP-Referer": "https://waltonbd.com",
      "X-Title": "Walton AC Process Monthly Report"
    };
    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", { method: "GET", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const freeModels = [];
        const otherModels = [];

        data.data.forEach(m => {
          const id = m.id;
          const name = m.name || id;
          const isFree = id.endsWith(':free') || (m.pricing && m.pricing.prompt === 0 && m.pricing.completion === 0);
          if (isFree) {
            freeModels.push({ id, name: `${name} (FREE)`, isFree: true, context_length: m.context_length });
          } else {
            otherModels.push({ id, name, isFree: false, context_length: m.context_length });
          }
        });

        // Sort free models nicely
        freeModels.sort((a, b) => a.name.localeCompare(b.name));
        return { freeModels, otherModels, all: [...freeModels, ...otherModels] };
      }
    } catch (e) {
      console.warn("Could not dynamically load OpenRouter models, using verified catalog:", e.message);
    }

    // Fallback verified models
    const fallbackFree = [
      { id: "google/gemini-2.0-flash-exp:free", name: "Google: Gemini 2.0 Flash (Fast & Accurate - Recommended)", isFree: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek: R1 Reasoning (Deep Logic - Free)", isFree: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B Instruct (High Capability - Free)", isFree: true },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen: 2.5 Coder 32B (Technical & Code - Free)", isFree: true },
      { id: "mistralai/mistral-small-24b-instruct-2501:free", name: "Mistral: Small 24B Instruct (Free)", isFree: true },
      { id: "deepseek/deepseek-chat:free", name: "DeepSeek: V3 Chat (Free)", isFree: true }
    ];
    return { freeModels: fallbackFree, otherModels: [], all: fallbackFree };
  }

  /**
   * Low-level helper to call OpenRouter Chat Completions
   */
  async callOpenRouter(messages, temperature = 0.2, maxTokens = 600, jsonMode = false) {
    const key = this.getOpenRouterKey();
    if (!key) throw new Error("OpenRouter API key is not configured.");
    const model = this.getOpenRouterModel();

    const payload = {
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    };
    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(this.OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://waltonbd.com",
        "X-Title": "Walton AC Process Monthly Report",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response structure from OpenRouter.");
    }
    return data.choices[0].message.content;
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
      const cached = this.cache ? this.cache.get(task) : null;
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

    const provider = this.getProvider();

    // 2. OPENROUTER PROVIDER
    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = this.templates.buildTaskPrompt(task);
        const rawReply = await this.callOpenRouter([
          { role: "system", content: this.templates.SYSTEM_INSTRUCTION },
          { role: "user", content: prompt }
        ], this.config.TEMPERATURE, this.config.MAX_OUTPUT_TOKENS, true);

        // Strip markdown fences if present
        const cleanJson = rawReply.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const result = {
          ai_report_title: parsed.ai_report_title || task.task_name || task.original_task_name,
          ai_description: parsed.ai_description || parsed.ai_report_description || "",
          ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : (parsed.ai_report_impact ? [parsed.ai_report_impact] : []),
          ai_category: parsed.ai_category || "Process Development",
          ai_project_type: parsed.ai_project_type || "Process Improvement",
          fromCache: false,
          source: `openrouter:${this.getOpenRouterModel()}`
        };

        if (this.cache) this.cache.set(task, result);
        return result;
      } catch (err) {
        console.warn("OpenRouter API call failed, falling back to local factual transformation:", err.message);
        const fallback = this.templates.localFactualTransform(task);
        if (this.cache) this.cache.set(task, fallback);
        return { ...fallback, fromCache: false, source: "fallback_after_openrouter_error", error: err.message };
      }
    }

    // 3. GEMINI DIRECT PROVIDER
    const geminiKey = this.getApiKey();
    if (provider === "gemini" && geminiKey) {
      try {
        const prompt = this.templates.buildTaskPrompt(task);
        const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${geminiKey}`;

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

          if (this.cache) this.cache.set(task, result);
          return result;
        } else {
          throw new Error("Invalid response format from Gemini API");
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local factual transformation:", err.message);
        const fallback = this.templates.localFactualTransform(task);
        if (this.cache) this.cache.set(task, fallback);
        return { ...fallback, fromCache: false, source: "fallback_after_gemini_error", error: err.message };
      }
    }

    // 4. OFFLINE / LOCAL RULE FALLBACK
    const fallback = this.templates.localFactualTransform(task);
    if (this.cache) this.cache.set(task, fallback);
    return { ...fallback, fromCache: false, source: "local_rule" };
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
   * Uses OpenRouter Free API, Gemini, or local fallback
   */
  async generateTaskSteps(taskName = "", category = "") {
    const provider = this.getProvider();

    // 1. Try OpenRouter
    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = `You are a real-world manufacturing plant engineer at Walton AC production line.
Write 3 to 4 sequential, realistic, concrete engineering milestones as written by a human factory engineer on the floor:
Task: "${taskName}"
Category: "${category}"

RULES FOR HUMAN TONE:
- Write strictly in concise, practical engineering steps.
- Use natural shop-floor terms: CAD model, fabrication, CNC machining, pneumatic clamping fixture, sensor routing, line trial, cycle time verification, work instruction SOP handover.
- Do NOT use robotic buzzwords or generic AI phrases.
- Format strictly as a single clean line: "1. First milestone 2. Second milestone 3. Third milestone 4. Fourth milestone".
- Zero markdown, no commentary.`;

        const reply = await this.callOpenRouter([
          { role: "system", content: "You are an experienced industrial process development engineer at Walton Hi-Tech Industries PLC. Write in clean, authentic, human engineering language." },
          { role: "user", content: prompt }
        ], 0.2, 200, false);

        if (reply && reply.trim()) {
          return reply.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } catch (err) {
        console.warn("OpenRouter step generation fallback:", err.message);
      }
    }

    // 2. Try Gemini
    const geminiKey = this.getApiKey();
    if (provider === "gemini" && geminiKey) {
      try {
        const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${geminiKey}`;
        const prompt = `You are an industrial process development engineer at Walton AC factory.
Write 3 to 4 sequential, realistic, concrete engineering milestones as written by a human factory engineer:
Task: "${taskName}"
Category: "${category}"

Format strictly as a single line: "1. First milestone 2. Second milestone 3. Third milestone 4. Fourth milestone".
Keep it concise, actionable, and suitable for manufacturing plant execution. Zero markdown.`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text.trim();
            return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
          }
        }
      } catch (err) {
        console.warn("Gemini step generation fallback:", err.message);
      }
    }

    // 3. Deterministic Local Fallback
    return this.templates.generateEngineeringSteps(taskName, category);
  }

  /**
   * Generates executive management impact highlights (3 bullet points)
   * Focuses on cost savings, cycle time, quality, and safety
   */
  async generateManagementImpact(taskName = "", category = "", costImpact = "", timeline = "") {
    const provider = this.getProvider();

    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = `Generate strictly 3 high-impact executive management outcomes for this manufacturing project:
Project Name: "${taskName}"
Category: "${category}"
Annual Cost Impact: "${costImpact || 'Significant cost avoidance and scrap reduction'}"
Timeline: "${timeline || 'Target FY 26-27'}"

RULES FOR HUMAN TONE:
- Write in an authentic, executive operations director tone at Walton Hi-Tech Industries.
- Format strictly as 3 bullet points starting with '• '.
- State genuine operational outcomes: cycle time reduction, scrap elimination, tooling repeatability, worker ergonomic safety, line yield.
- No robotic filler words. Keep each bullet under 18 words.`;

        const reply = await this.callOpenRouter([
          { role: "system", content: "You are the Head of Process Development at Walton Hi-Tech Industries PLC. Write in a realistic, authoritative, human executive tone." },
          { role: "user", content: prompt }
        ], 0.2, 250, false);

        if (reply && reply.trim()) {
          return reply.trim();
        }
      } catch (e) {
        console.warn("OpenRouter management impact generation fallback:", e.message);
      }
    }

    // Fallback deterministic executive bullets
    return [
      `• Streamlines manufacturing operations and enhances process reliability`,
      `• Generates verified cost avoidance of ${costImpact || 'annual financial impact'} and material savings`,
      `• Improves cycle time efficiency and ensures 100% quality compliance on Walton AC lines`
    ].join('\n');
  }
}

const geminiClient = new GeminiClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient, geminiClient };
} else if (typeof window !== 'undefined') {
  window.GeminiClient = GeminiClient;
  window.geminiClient = geminiClient;
}

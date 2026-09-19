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
    this.PROXY_ENDPOINT = "/api/openrouter";
    this.OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
    this.STORAGE_KEY_PROVIDER = "walton_pd_ai_provider";
    this.STORAGE_KEY_OPENROUTER_KEY = "walton_pd_openrouter_api_key";
    this.STORAGE_KEY_OPENROUTER_MODEL = "walton_pd_openrouter_model";
    this.DEFAULT_OPENROUTER_MODEL = "openrouter/free";
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
   * Prioritizes secure Vercel /api/openrouter proxy, falling back to direct fetch
   */
  async testOpenRouterConnection(apiKey = null, model = null) {
    const key = apiKey || this.getOpenRouterKey();
    const mdl = model || this.getOpenRouterModel();
    const startTime = Date.now();

    // 1. Try Vercel Serverless Route /api/openrouter (Primary, Secure)
    const isBrowser = typeof window !== 'undefined';
    const isNotLocalFile = isBrowser && window.location.protocol !== 'file:';

    if (isNotLocalFile) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (key) headers["x-openrouter-key"] = key;

        const proxyRes = await fetch(this.PROXY_ENDPOINT, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ action: "test", model: mdl, apiKey: key })
        });

        if (proxyRes.status !== 404 && proxyRes.status !== 502) {
          const proxyData = await proxyRes.json();
          const isSuccess = Boolean(proxyData.success);
          return {
            success: isSuccess,
            connected: isSuccess,
            provider: "OpenRouter",
            status: proxyData.status || (isSuccess ? "Connected" : "Failed"),
            model: proxyData.model || mdl,
            latency: proxyData.latency || (Date.now() - startTime),
            timestamp: proxyData.timestamp || new Date().toISOString(),
            error: proxyData.error || (isSuccess ? null : "Connection failed"),
            details: proxyData.details || "",
            reply: proxyData.reply || ""
          };
        }
      } catch (proxyErr) {
        console.warn("Vercel proxy /api/openrouter unreachable, testing direct connection:", proxyErr.message);
      }
    }

    // 2. Direct OpenRouter Connection Fallback (For local file:// or standalone setups)
    if (!key) {
      return {
        success: false,
        connected: false,
        status: "Failed",
        model: mdl,
        timestamp: new Date().toISOString(),
        error: "Invalid API Key: OpenRouter API key is empty. Please enter your key or set OPENROUTER_API_KEY on the server.",
        latency: Date.now() - startTime
      };
    }

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
            { role: "user", content: "Say OK" }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });

      const latency = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text();
        let diagReason = `API Request Failed (HTTP ${response.status})`;
        let errDetails = "";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error && errJson.error.message) errDetails = errJson.error.message;
        } catch (_) {
          if (errText) errDetails = errText.slice(0, 150);
        }

        if (response.status === 401 || response.status === 403) {
          diagReason = "Invalid API Key: OpenRouter rejected the API key as unauthorized or revoked.";
        } else if (response.status === 402) {
          diagReason = "Insufficient Credits: OpenRouter account has ran out of credits.";
        } else if (response.status === 404) {
          diagReason = `Model Not Available: The model "${mdl}" is unavailable or deprecated on OpenRouter.`;
        } else if (response.status === 429) {
          diagReason = "Rate Limit Exceeded: Free tier rate limits reached. Please wait a moment.";
        } else if (errDetails) {
          diagReason = `API Request Failed: ${errDetails}`;
        }

        return {
          success: false,
          connected: false,
          status: "Failed",
          error: diagReason,
          details: errDetails,
          latency,
          model: mdl,
          code: response.status,
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      const msg = choice ? choice.message : null;
      const rawReply = msg ? (msg.content || msg.reasoning || "OK") : "OK";
      const reply = String(rawReply || "OK").trim();

      return {
        success: true,
        connected: true,
        status: "Connected",
        provider: "OpenRouter",
        latency,
        reply: reply || "OK",
        model: mdl,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return {
        success: false,
        connected: false,
        status: "Failed",
        error: `API Request Failed: ${e.message || "Network / CORS connection error."}`,
        latency: Date.now() - startTime,
        model: mdl,
        timestamp: new Date().toISOString()
      };
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
        // Prepend OpenRouter Free Models Auto-Router at the very top
        freeModels.unshift(
          { id: "openrouter/free", name: "OpenRouter: Free Models Auto-Router (100% Free - Recommended)", isFree: true },
          { id: "openrouter/auto", name: "OpenRouter: Auto Router (Best Fit)", isFree: true }
        );
        const seen = new Set();
        const uniqueFree = freeModels.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        return { freeModels: uniqueFree, otherModels, all: [...uniqueFree, ...otherModels] };
      }
    } catch (e) {
      console.warn("Could not dynamically load OpenRouter models, using verified catalog:", e.message);
    }

    // Fallback verified models
    const fallbackFree = [
      { id: "openrouter/free", name: "OpenRouter: Free Models Auto-Router (100% Free - Recommended)", isFree: true },
      { id: "openrouter/auto", name: "OpenRouter: Auto Router (Best Fit)", isFree: true },
      { id: "google/gemini-2.0-flash-exp:free", name: "Google: Gemini 2.0 Flash (Fast & Accurate)", isFree: true },
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
    const model = this.getOpenRouterModel();

    // 1. Try Vercel Serverless Route /api/openrouter
    const isBrowser = typeof window !== 'undefined';
    const isNotLocalFile = isBrowser && window.location.protocol !== 'file:';

    if (isNotLocalFile) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (key) headers["x-openrouter-key"] = key;

        const proxyPayload = {
          action: "chat",
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        };
        if (jsonMode) proxyPayload.response_format = { type: "json_object" };

        const proxyRes = await fetch(this.PROXY_ENDPOINT, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(proxyPayload)
        });

        if (proxyRes.status !== 404 && proxyRes.status !== 502) {
          const proxyData = await proxyRes.json();
          if (!proxyRes.ok || !proxyData.success) {
            throw new Error(proxyData.error || `OpenRouter Error (${proxyRes.status})`);
          }
          return proxyData.content;
        }
      } catch (proxyErr) {
        if (!key) throw proxyErr;
        console.warn("Proxy chat call failed, falling back to direct API:", proxyErr.message);
      }
    }

    // 2. Direct fallback
    if (!key) throw new Error("OpenRouter API key is not configured.");

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
    const msg = data.choices[0].message;
    const content = msg ? (msg.content || msg.reasoning || "") : "";
    return String(content || "");
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
        const cleanJson = String(rawReply || "").replace(/```json/gi, '').replace(/```/g, '').trim();
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
   * Generates 4-5 industrial engineering milestone breakdown steps for a task
   * Uses OpenRouter Free API, Gemini, or domain-rich local template fallback
   * Ensures STRICT numbered format ("1. ... 2. ... 3. ... 4. ... 5. ...") with ZERO AI reasoning leakage
   */
  async generateTaskSteps(taskName = "", category = "") {
    const cleanName = (taskName || "").trim();
    if (!cleanName) return "";

    const provider = this.getProvider();

    // Helper to sanitize and normalize AI reply into 4-5 numbered steps
    const sanitizeSteps = (raw) => {
      if (!raw || typeof raw !== 'string') return "";
      let s = raw.trim();

      // 1. Remove thinking / reasoning XML tags from reasoning models (e.g. DeepSeek-R1)
      s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // 2. Locate the start of the actual numbered steps (e.g. "1. ")
      const firstStepMatch = s.search(/\b1[\.\)]\s/);
      if (firstStepMatch !== -1) {
        s = s.substring(firstStepMatch);
      } else {
        // Strip common conversational filler prefixes
        s = s.replace(/^(?:The user wants|Here is|Sure|Here are|Okay|Below are|As an engineer|Step[- ]by[- ]step)[\s\S]*?:/i, '').trim();
      }

      // 3. Remove markdown bold/italics/bullet symbols
      s = s.replace(/[*_#`]/g, '');

      // 4. Standardize any bullet/number variations e.g. "1) " -> "1. ", "- 1. " -> "1. "
      s = s.replace(/^\s*[-•*]\s*/gm, '');
      s = s.replace(/\b(\d+)[\)]\s/g, '$1. ');

      // 5. Convert multiline steps to single spaced string
      s = s.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

      // 6. Ensure it has at least 3 numbered points; if not, reject and use template fallback
      const stepCount = (s.match(/\b\d+\.\s/g) || []).length;
      if (stepCount < 3) return "";

      return s;
    };

    // 1. Try OpenRouter
    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = `You are an industrial process development engineer at Walton AC factory.
Task Name: "${cleanName}"
Category: "${category || "Process development"}"

INSTRUCTIONS:
Break down this exact task into 4 to 5 sequential, concrete, shop-floor engineering steps.
Include specific engineering actions relevant to "${cleanName}" (e.g., CAD design, tooling fabrication, CNC machining, sensor/pneumatic setup, line trial run, cycle time verification, SOP documentation).

STRICT OUTPUT FORMAT:
- Output ONLY 4 to 5 numbered steps.
- Format strictly as: "1. [Step 1] 2. [Step 2] 3. [Step 3] 4. [Step 4] 5. [Step 5]".
- Absolutely NO introductory phrases, NO thinking/reasoning text, NO conversational filler (do NOT say "The user wants...", "Here are the steps...", etc.).
- Start directly with "1. ".`;

        const reply = await this.callOpenRouter([
          { role: "system", content: "You are an expert industrial manufacturing process engineer at Walton AC factory. Output strictly 4 to 5 numbered engineering steps. Start immediately with '1. '. Do not write any thoughts, notes, or intros." },
          { role: "user", content: prompt }
        ], 0.2, 450, false);

        const cleaned = sanitizeSteps(reply);
        if (cleaned) {
          return cleaned;
        }
      } catch (err) {
        console.warn("OpenRouter step generation notice:", err.message);
      }
    }

    // 2. Try Gemini
    const geminiKey = this.getApiKey();
    if (provider === "gemini" && geminiKey) {
      try {
        const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${geminiKey}`;
        const prompt = `You are a manufacturing process development engineer at Walton AC factory.
Task Name: "${cleanName}"
Category: "${category || "Process development"}"

Break down this task into 4 to 5 sequential, realistic engineering steps directly related to "${cleanName}".
Format strictly as: "1. Step 1 2. Step 2 3. Step 3 4. Step 4 5. Step 5".
No intro, no markdown, no filler. Start directly with "1. ".`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 350 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text.trim();
            const cleaned = sanitizeSteps(text);
            if (cleaned) {
              return cleaned;
            }
          }
        }
      } catch (err) {
        console.warn("Gemini step generation notice:", err.message);
      }
    }

    // 3. High-Quality Deterministic Local Fallback (Guaranteed 4-5 numbered steps tailored to taskName)
    return this.templates.generateEngineeringSteps(cleanName, category);
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

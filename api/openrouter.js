/**
 * Process Development Monthly Report Automation System
 * Vercel Serverless API Route: /api/openrouter
 * Securely proxies OpenRouter API requests without exposing API keys to the browser
 * WALTON Hi-Tech Industries PLC
 */

module.exports = async function handler(req, res) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-openrouter-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow GET for status check
  if (req.method === 'GET') {
    const hasEnvKey = Boolean(process.env.OPENROUTER_API_KEY);
    return res.status(200).json({
      status: 'OK',
      service: 'Walton OpenRouter Proxy API',
      hasServerKey: hasEnvKey,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    body = body || {};

    // 2. Resolve API Key (Priority: Server Environment Variable -> Request Header -> Request Body)
    const serverKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const headerKey = (req.headers['x-openrouter-key'] || '').trim();
    const bodyKey = (body.apiKey || '').trim();
    const effectiveKey = serverKey || headerKey || bodyKey;

    if (!effectiveKey) {
      return res.status(401).json({
        success: false,
        code: 'MISSING_API_KEY',
        error: 'Invalid API Key: OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in Vercel environment variables or enter your key in Settings.'
      });
    }

    const action = body.action || 'chat';
    const model = body.model || 'openrouter/free';
    const startTime = Date.now();

    // 3. ACTION: FETCH MODELS
    if (action === 'models') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${effectiveKey}`,
          'HTTP-Referer': 'https://waltonbd.com',
          'X-Title': 'Walton AC Process Monthly Report'
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `OpenRouter Models Error (${response.status}): ${errText.slice(0, 150)}`
        });
      }
      const data = await response.json();
      return res.status(200).json({ success: true, data: data.data || [] });
    }

    // 4. ACTION: CONNECTION TEST
    if (action === 'test') {
      const testPayload = {
        model: model,
        messages: [
          { role: 'user', content: 'Say OK' }
        ],
        max_tokens: 50,
        temperature: 0.1
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveKey}`,
          'HTTP-Referer': 'https://waltonbd.com',
          'X-Title': 'Walton AC Process Monthly Report',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const latency = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text();
        let diagReason = `API Request Failed (HTTP ${response.status})`;
        let errDetails = '';
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error && errJson.error.message) errDetails = errJson.error.message;
        } catch (_) {
          errDetails = errText.slice(0, 150);
        }

        if (response.status === 401 || response.status === 403) {
          diagReason = 'Invalid API Key: OpenRouter rejected the API key as unauthorized or revoked.';
        } else if (response.status === 402) {
          diagReason = 'Insufficient Credits: OpenRouter account has ran out of credits.';
        } else if (response.status === 404) {
          diagReason = `Model Not Available: The model "${model}" is unavailable or deprecated on OpenRouter.`;
        } else if (response.status === 429) {
          diagReason = 'Rate Limit Exceeded: Free tier rate limit reached. Please wait a moment before trying again.';
        } else if (errDetails) {
          diagReason = `API Request Failed: ${errDetails}`;
        }

        return res.status(response.status).json({
          success: false,
          error: diagReason,
          details: errDetails,
          code: response.status,
          latency
        });
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      const msg = choice ? choice.message : null;
      const rawReply = msg ? (msg.content || msg.reasoning || 'OK') : 'OK';
      const reply = String(rawReply || 'OK').trim();

      return res.status(200).json({
        success: true,
        status: 'Connected',
        provider: 'OpenRouter',
        model: model,
        latency,
        reply: reply || 'OK',
        timestamp: new Date().toISOString()
      });
    }

    // 5. ACTION: CHAT COMPLETIONS (Standard AI generation)
    const messages = body.messages || [{ role: 'user', content: body.prompt || 'Hello' }];
    const payload = {
      model: model,
      messages: messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 600
    };
    if (body.response_format) {
      payload.response_format = body.response_format;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveKey}`,
        'HTTP-Referer': 'https://waltonbd.com',
        'X-Title': 'Walton AC Process Monthly Report',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const latency = Date.now() - startTime;
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `OpenRouter Error (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
      } catch (_) {
        if (errText) errMsg = errText.slice(0, 150);
      }
      return res.status(response.status).json({
        success: false,
        error: errMsg,
        status: response.status,
        latency
      });
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(502).json({
        success: false,
        error: 'Invalid response structure from OpenRouter upstream.'
      });
    }

    const choice = data.choices[0];
    const msg = choice.message;
    const content = msg ? (msg.content || msg.reasoning || '') : '';

    return res.status(200).json({
      success: true,
      content: String(content || ''),
      model: data.model || model,
      latency
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Internal Server Error: ${err.message}`
    });
  }
};

/**
 * DevPulse Copilot Tracker — content script (runs in MAIN world)
 *
 * Wraps window.fetch to intercept GitHub Copilot API responses.
 * Extracts token usage from the response and forwards it to the
 * local DevPulse agent at http://localhost:9339/log
 *
 * Covered endpoints:
 *   https://api.github.com/copilot_internal/*   (Copilot Chat on GitHub.com)
 *   https://api.github.com/copilot/*            (VS Code Web Copilot)
 *   https://copilot-proxy.githubusercontent.com/* (completions)
 */

;(function () {
  'use strict'

  const AGENT_URL   = 'http://localhost:9339/log'
  const COPILOT_RE  = /copilot[\-_](?:proxy|internal)|api\.github\.com\/copilot/i

  const _fetch = window.fetch.bind(window)

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input
      : input instanceof Request ? input.url
      : String(input)

    const response = await _fetch(input, init)

    if (COPILOT_RE.test(url) && response.ok) {
      const clone = response.clone()
      clone.json().then(data => {
        const usage = data?.usage ?? data?.data?.usage
        if (!usage) return

        const payload = {
          promptTokens:     usage.prompt_tokens     ?? usage.input_tokens  ?? 0,
          completionTokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
          totalTokens:      usage.total_tokens      ?? usage.prompt_tokens + usage.completion_tokens ?? 0,
          model:            data?.model ?? 'copilot',
          source:           'browser-extension',
          file:             document.title || location.pathname,
        }

        if (payload.totalTokens === 0) return

        // Fire-and-forget to local agent (no await to not block response)
        _fetch(AGENT_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }).catch(() => {/* agent not running is fine */})
      }).catch(() => {/* not JSON or no usage field */})
    }

    return response
  }

  console.debug('[DevPulse] Copilot tracker active on', location.host)
})()

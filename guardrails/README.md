# Guardrails and Safety Pattern

This folder implements the **Guardrails and Safety Pattern** (inspired by Chapter 16 of *Agentic Design Patterns*). Deploying AI agents in production requires guaranteeing that they do not execute harmful actions, leak private credentials, bad-mouth competitors, or drift off-topic. Relying solely on prompts given to the primary model is highly vulnerable to jailbreak prompts (adversarial attacks).

This pattern builds a **Defense-in-Depth Safety Shield** around the core agent logic by isolating evaluation processes into three separate components:

```
[User Input] ➔ [1. Input Guardrail] ➔ (Blocked if Non-Compliant)
                        ↓ (Compliant)
                [2. Primary Advisor] ➔ Generated Response
                                            ↓
                                    [3. Output Guardrail] ➔ (Blocked if Leak Detected)
                                            ↓ (Compliant)
                                    [Final Response]
```

---

## Safety Mechanisms

1. **Input Pre-Screening (Input Guardrail)**:
   - Screens queries before invoking the main agent, saving token cost and compute.
   - Evaluates compliance against:
     - **Instruction Subversion (Jailbreaks)**: Attempts to reset rules or trick the model.
     - **Prohibited Content**: Requests for illegal acts or dangerous activities.
     - **Irrelevance / Domain Isolation**: Blocks general knowledge queries (e.g. history, chitchat) to restrict interactions strictly to corporate scope.
     - **Brand Defamation**: Filters efforts to write comparative competitor slander.

2. **Output Post-Validation (Output Guardrail)**:
   - Scans generated responses before they reach the user interface.
   - Evaluates compliance against:
     - **PII & Secrets Leaks**: Catches leaked mock Social Security Numbers, API keys, or databases (combines regex scanning with LLM logical intent parsing).
     - **Toxicity & Brand Safety**: Ensures replies remain polite, professional, and do not slander competitors.

3. **Graceful Fallbacks**:
   - When a violation is caught by the output guard, the system replaces it with a generic message: `I apologize, but my response was blocked by corporate safety guardrails.`

---

## File Structure

- `package.json` — ES Modules configuration and dependencies.
- `policies.js` — Core policy statements, regex patterns, and fallback strings.
- `input-guardrail.js` — pre-screens queries using Ollama JSON responses.
- `primary-advisor.js` — The core corporate knowledge bot (holds policies on remote work, core hours, etc.).
- `output-guardrail.js` — Post-screens responses for secret keys, PII leaks, and professionalism.
- `index.js` — CLI orchestrator running safe queries, jailbreaks, off-domain hacks, and database leaks.

---

## Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm start
   ```

3. Select a scenario preset to observe how the guardrail shield pre-screens, passes, blocks, or intercepts outputs dynamically.

import vm from "vm";
import { evaluateCode, FIB_TEST_CASES } from "./evaluator.js";

// Helper to extract code blocks from Markdown
function extractCodeBlock(text) {
  const match = text.match(/```javascript([\s\S]*?)```/) || text.match(/```js([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return text.trim();
}

export class CodeEvolver {
  constructor(ollama, model) {
    this.ollama = ollama;
    this.model = model;
    this.database = []; // Archive of all code versions: { generation, code, metrics }
  }

  /**
   * Initializes the program database with the baseline program.
   */
  initializeDatabase(initialCode) {
    console.log("   📊 [Program Database] Evaluating baseline code...");
    try {
      const metrics = evaluateCode(initialCode, FIB_TEST_CASES, "fibonacci");
      this.database.push({
        generation: 0,
        code: initialCode,
        metrics
      });
      return metrics;
    } catch (err) {
      console.error(`   ❌ Failed to initialize database with baseline code: ${err.message}`);
      const fallbackCode = `
function fibonacci(n) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
      `.trim();
      const metrics = evaluateCode(fallbackCode, FIB_TEST_CASES, "fibonacci");
      this.database.push({
        generation: 0,
        code: fallbackCode,
        metrics
      });
      return metrics;
    }
  }

  /**
   * Samples the program database to find the highest-performing version.
   */
  getBestVersion() {
    if (this.database.length === 0) return null;
    return [...this.database].sort((a, b) => b.metrics.score - a.metrics.score)[0];
  }

  /**
   * Helper to perform LLM calls with exponential backoff retries.
   */
  async callLLMWithRetry(prompt, maxRetries = 3, initialDelayMs = 1000) {
    let lastError = null;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.ollama.chat({
          model: this.model,
          messages: [{ role: "user", content: prompt }]
        });
        
        if (!response?.message?.content) {
          throw new Error("Received empty or invalid message content from Ollama.");
        }
        
        return response.message.content;
      } catch (err) {
        lastError = err;
        console.warn(`      ⚠️  Ollama API call attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          console.log(`      ⏳  Retrying in ${(delay / 1000).toFixed(1)}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw new Error(`LLM request failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Validates syntax and basic requirements of generated code.
   */
  validateGeneratedCode(code, functionName = "fibonacci") {
    if (!code || code.trim() === "") {
      throw new Error("Generated code is empty.");
    }
    
    const hasFunctionDeclaration = new RegExp(`function\\s+${functionName}\\b`).test(code);
    const hasArrowFunction = new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=`).test(code);
    
    if (!hasFunctionDeclaration && !hasArrowFunction) {
      throw new Error(`Generated code does not contain a function named '${functionName}'.`);
    }
    
    try {
      new vm.Script(code);
    } catch (err) {
      throw new Error(`Generated code has syntax errors: ${err.message}`);
    }
  }

  /**
   * Invokes Llama 3.2 to mutate and optimize the current best program.
   */
  async mutateCode(bestVersion) {
    const errorSection = bestVersion.metrics.errors.length > 0
      ? `**Execution Failures & Critiques to Address:**\n${bestVersion.metrics.errors.map(e => `- ${e}`).join("\n")}`
      : "The function is correct, but needs optimization for execution speed (latency) and size.";

    const prompt = `
You are the OpenEvolve Genetic Code Optimizer.
Your job is to optimize and evolve the provided JavaScript function 'fibonacci(n)' to improve its correctness and execution speed.

**Goal:**
Compute the n-th Fibonacci number. It must be extremely fast and handle values up to n=35.

**Current Best Program (Generation ${bestVersion.generation}):**
\`\`\`javascript
${bestVersion.code}
\`\`\`

**Performance Metrics:**
- Correctness Success: ${(bestVersion.metrics.successRate * 100).toFixed(1)}% (${bestVersion.metrics.passedCount}/${bestVersion.metrics.totalCount} tests passed)
- Execution Latency: ${bestVersion.metrics.durationMs.toFixed(4)}ms
- Code Size: ${bestVersion.metrics.codeSizeChars} characters
- Fitness Score: ${bestVersion.metrics.score.toFixed(2)}

**Feedback/Analysis:**
${errorSection}

**Evolution Guidelines:**
- **CRITICAL**: If the execution latency is high (e.g. >10ms), it means your code uses an exponential O(2^n) recursion. You MUST rewrite the algorithm to use a linear O(n) iterative loop, memoization array, or O(log n) matrix exponentiation to avoid exponential complexity.
- Handle base cases correctly (n=0 returns 0, n=1 returns 1).
- Output ONLY the optimized JavaScript function 'fibonacci(n)' inside a single markdown code block (e.g. \`\`\`javascript ... \`\`\`).
- Do not write any explanations, introduction messages, or usage examples outside the code block.
`.trim();

    const startTime = Date.now();
    let lastError = null;
    let delay = 1000;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const rawResponse = await this.callLLMWithRetry(prompt, 2, 1000);
        const mutatedCode = extractCodeBlock(rawResponse);
        this.validateGeneratedCode(mutatedCode, "fibonacci");
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ⏱  Mutator generated and validated code variation in ${elapsed}s (Attempt ${attempt})`);
        return mutatedCode;
      } catch (err) {
        lastError = err;
        console.warn(`      ⚠️  Mutation attempt ${attempt} validation/generation failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    throw new Error(`Failed to generate a valid mutated code version after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Runs the evolutionary loop for N generations.
   */
  async runEvolution(generationsCount = 3) {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  🧬  LEARNING & ADAPTATION PATTERN — OpenEvolve Code Optimizer");
    console.log("═══════════════════════════════════════════════════════════\n");

    const overallStartTime = Date.now();

    for (let gen = 1; gen <= generationsCount; gen++) {
      console.log(`━━━ Generation ${gen}/${generationsCount} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      try {
        // Step 1: Sample the parent (best version so far)
        const parent = this.getBestVersion();
        if (!parent) {
          throw new Error("No parent program available in database.");
        }
        console.log(`   🗂  Sampling parent from DB: Gen ${parent.generation} (Score: ${parent.metrics.score.toFixed(2)})`);

        // Step 2: Mutate the code using the LLM
        console.log("   🧬  Mutating code to optimize algorithms...");
        const mutatedCode = await this.mutateCode(parent);

        // Step 3: Evaluate the new candidate
        console.log("   🔬  Running Evaluator Pool tests...");
        const metrics = evaluateCode(mutatedCode, FIB_TEST_CASES, "fibonacci");

        // Save to database (learning database)
        this.database.push({
          generation: gen,
          code: mutatedCode,
          metrics
        });

        console.log(`   📊 Result: Correctness: ${(metrics.successRate * 100).toFixed(1)}% | Speed: ${metrics.durationMs.toFixed(4)}ms | Score: ${metrics.score.toFixed(2)}`);
        if (metrics.errors.length > 0) {
          console.log(`      ⚠️ Failures: ${metrics.errors[0]}`);
        }
      } catch (err) {
        console.error(`   ❌ Generation ${gen} failed: ${err.message}`);
        console.log(`   🔄 Recovering: logging failed attempt and proceeding to next generation.`);
        
        // Log failure in database with low fitness score so it's not chosen as parent
        this.database.push({
          generation: gen,
          code: "// Failed mutation generation",
          metrics: {
            successRate: 0,
            passedCount: 0,
            totalCount: FIB_TEST_CASES.length,
            durationMs: 999,
            codeSizeChars: 0,
            score: -5000,
            errors: [err.message]
          }
        });
      }
      console.log("");
    }

    const duration = ((Date.now() - overallStartTime) / 1000).toFixed(1);
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  ✅  Evolution loop completed in ${duration}s total!`);
    console.log("═══════════════════════════════════════════════════════════\n");

    return {
      database: this.database,
      best: this.getBestVersion(),
      duration
    };
  }
}

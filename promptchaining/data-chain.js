/**
 * Prompt Chaining — Data Pipeline (ETL with LLMs)
 * =================================================
 *
 * A 3-step data processing chain using Ollama (Llama 3.2):
 *
 *   Step 1 — Extract:    Parse raw unstructured data into structured JSON
 *   Step 2 — Transform:  Clean, normalize, enrich, and validate the data
 *   Step 3 — Summarize:  Generate insights, statistics, and a final report
 *
 * Each step's output is fed as context into the next step.
 *
 * Usage:
 *   import { runDataPipelineChain } from "./data-chain.js";
 *   const results = await runDataPipelineChain(rawData, dataType);
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";

const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Prompt Templates ──────────────────────────────────────────────────────────

const PROMPTS = {
  /**
   * Step 1: Extract structured data from raw input
   * Input:  raw unstructured text
   * Output: structured JSON array
   */
  extract: (rawData, dataType) => `
You are an expert data engineer. Extract structured data from the following raw ${dataType} data.

**Raw Data:**
\`\`\`
${rawData}
\`\`\`

Your task:
1. Identify all individual records/entities in the data
2. Extract key fields for each record
3. Output as a valid JSON array

Respond with ONLY these sections:

## Extraction Summary
- How many records were found
- What fields were identified
- Any records that were ambiguous or incomplete

## Extracted Data
\`\`\`json
[
  { ... },
  { ... }
]
\`\`\`

## Data Quality Notes
- List any missing values, inconsistencies, or formatting issues found
`.trim(),

  /**
   * Step 2: Transform and enrich the extracted data
   * Input:  extracted JSON + extraction notes
   * Output: cleaned, normalized, enriched data
   */
  transform: (rawData, extractedData, dataType) => `
You are an expert data engineer. Transform and enrich the extracted ${dataType} data below.

**Original Raw Data:**
\`\`\`
${rawData}
\`\`\`

**Extracted Data from Step 1:**
${extractedData}

Perform ALL of the following transformations:

### Cleaning
- Fix typos, inconsistent casing, and formatting
- Standardize date formats to ISO 8601 (YYYY-MM-DD)
- Standardize phone numbers, emails, currencies
- Remove duplicates

### Normalization
- Ensure consistent field names (camelCase)
- Normalize categories/tags to a standard set
- Convert units to a single standard

### Enrichment
- Add derived fields (e.g., calculated totals, age from birthdate, full name from parts)
- Add data quality flags (valid/invalid/needs-review)
- Categorize records if applicable

### Validation
- Flag records with missing required fields
- Flag values that seem like outliers
- Check for logical inconsistencies

Respond with:

## Transformation Log
List each transformation applied and how many records it affected.

## Transformed Data
\`\`\`json
[
  { ... },
  { ... }
]
\`\`\`

## Validation Report
| Record | Issue | Severity |
|--------|-------|----------|
| ...    | ...   | ...      |
`.trim(),

  /**
   * Step 3: Summarize and generate insights
   * Input:  transformed data + transformation log
   * Output: analytics, insights, and final report
   */
  summarize: (transformedData, dataType) => `
You are an expert data analyst. Analyze the transformed ${dataType} data and generate a comprehensive report.

**Transformed Data from Step 2:**
${transformedData}

Generate a complete analysis with these sections:

## 📊 Statistics
- Total records, valid vs. invalid counts
- Key numeric summaries (min, max, average, median where applicable)
- Distribution of categories/types

## 🔍 Key Insights
- Top 3-5 notable patterns or trends
- Any correlations between fields
- Outliers and anomalies worth investigating

## 📋 Data Quality Score
Rate the overall data quality (0-100%) based on:
- Completeness (missing values)
- Consistency (format uniformity)
- Accuracy (logical correctness)
- Provide an overall grade: A / B / C / D / F

## 💡 Recommendations
- What additional data should be collected?
- What fields need better validation at the source?
- Suggested next steps for this dataset
`.trim(),
};

// ─── Chain Runner ───────────────────────────────────────────────────────────────

/**
 * Calls Ollama and returns the response text.
 */
async function callLLM(prompt, stepName) {
  const startTime = Date.now();

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  ${stepName} completed in ${elapsed}s\n`);

  return response.message.content;
}

/**
 * Runs the full 3-step data pipeline chain.
 *
 * @param {string} rawData - The raw unstructured data to process
 * @param {string} dataType - Description of the data type (e.g., "customer", "sales", "employee")
 * @returns {object} - Results from each step of the chain
 */
export async function runDataPipelineChain(rawData, dataType = "general") {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔗  PROMPT CHAINING — Data Pipeline (ETL)");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Step 1: Extract ─────────────────────────────────────────────────────
  console.log("━━━ Step 1/3: 📥 Extracting Structured Data ━━━━━━━━━━━━━━");
  const extracted = await callLLM(PROMPTS.extract(rawData, dataType), "Extraction");
  console.log(extracted);
  console.log("\n");

  // ── Step 2: Transform ───────────────────────────────────────────────────
  // Chain: feed Step 1 output (extracted data) into Step 2
  console.log("━━━ Step 2/3: 🔄 Transforming & Enriching ━━━━━━━━━━━━━━━━");
  const transformed = await callLLM(
    PROMPTS.transform(rawData, extracted, dataType),
    "Transformation"
  );
  console.log(transformed);
  console.log("\n");

  // ── Step 3: Summarize ───────────────────────────────────────────────────
  // Chain: feed Step 2 output (transformed data) into Step 3
  console.log("━━━ Step 3/3: 📊 Analyzing & Summarizing ━━━━━━━━━━━━━━━━━");
  const summary = await callLLM(PROMPTS.summarize(transformed, dataType), "Analysis");
  console.log(summary);
  console.log("\n");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ✅  Data pipeline complete!");
  console.log("═══════════════════════════════════════════════════════════\n");

  return { extracted, transformed, summary };
}

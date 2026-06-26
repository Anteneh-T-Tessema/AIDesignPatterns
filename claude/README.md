# 🛠️ Tool Use (Function Calling) Pattern — Python

Demonstrates the **Tool Use (Function Calling)** agentic design pattern in Python using the **Anthropic API** (Claude).

## What is the Tool Use Pattern?

In this pattern, the LLM is given access to external code functions (tools) via standard declarations (JSON schemas containing names, descriptions, and parameter properties). Rather than answering queries directly, the model decides to invoke a tool, hands over control to the client, receives the execution results, and uses them to construct a final answer.

```
                         [Python Tool execution]
                      ┌───────────────────────────┐
                      │                           ▼
  User Query ──▶ 🧠 Claude ──[tool_use block]──▶ 🐍 execute_tool()
                 ▲                                │
                 │                                ▼
                 └────────[tool_result block]─────┘
```

---

## Project Structure

```
study/claude/
├── tools_demo.py          ← Smart Database & Web Assistant (database, calculator, webpage policy fetcher)
├── finance_assistant.py   ← Personal Finance Advisor Assistant (stocks, currency exchange, compound interest)
├── .env                   ← For storing your ANTHROPIC_API_KEY
├── .gitignore             ← Excludes venv/ and secret key files
├── note.ipynb             ← Notebook setting up the environment
└── README.md              ← This guide
```

---

## Getting Started

### 1. Activate the Virtual Environment
```bash
source .venv/bin/activate
```

### 2. Configure Your API Key (Optional)
If you have an Anthropic API Key, save it in `.env`:
```env
ANTHROPIC_API_KEY=your-actual-api-key-here
```

---

## Running the Assistants

If you do not have an API key configured, both scripts will automatically run in **Simulator Mode**, displaying the exact tool loop execution logs.

### Assistant 1: Smart Web & Database Assistant (`tools_demo.py`)
Provides tools for database lookups, page fetches, and arithmetic.
```bash
# Run default query (Check database and calculate price with tax)
python3 tools_demo.py

# Run custom query
python3 tools_demo.py "Query products for headphones and check shipping policy for corporate tier"
```

### Assistant 2: Personal Finance Advisor Assistant (`finance_assistant.py`)
Provides tools for stock quotes, currency conversions, and compound interest savings.
```bash
# Run default query (Convert 500 USD to EUR and query AAPL stock)
python3 finance_assistant.py

# Run custom query (Compound interest calculation)
python3 finance_assistant.py "Calculate projected savings for P=10000, rate=5% over 10 years compounded monthly"

# Run currency exchange query
python3 finance_assistant.py "Convert 1200 GBP to USD"
```

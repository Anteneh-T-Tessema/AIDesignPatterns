#!/usr/bin/env python3
"""
Tool Use / Function Calling Pattern — Claude Smart Assistant
===========================================================

Demonstrates the TOOL USE agentic design pattern:

  1. Client sends user query + available python tool schemas to Claude.
  2. Claude decides to invoke a tool, outputting a tool_use request block.
  3. The local client catches the request, runs the python function, and collects results.
  4. Client returns the tool result blocks to Claude.
  5. Claude synthesizes the results and generates a final response.

                         [Python Tool execution]
                      ┌───────────────────────────┐
                      │                           ▼
  User Query ──▶ 🧠 Claude ──[tool_use block]──▶ 🐍 execute_tool()
                 ▲                                │
                 │                                ▼
                 └────────[tool_result block]─────┘

"""

import os
import sys
import json
import re
from dotenv import load_dotenv

# Try to import anthropic (will check availability)
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

load_dotenv()

# ─── Tool Implementations ─────────────────────────────────────────────────────

MOCK_PRODUCTS_DB = [
    {"id": 101, "name": "Titanium Keyboard", "price": 149.99, "stock": 42, "category": "peripherals"},
    {"id": 102, "name": "ErgoMouse Pro", "price": 89.99, "stock": 5, "category": "peripherals"},
    {"id": 103, "name": "4K UltraSharp Monitor", "price": 499.99, "stock": 12, "category": "screens"},
    {"id": 104, "name": "Noise Cancelling Headphones", "price": 299.99, "stock": 0, "category": "audio"}
]

MOCK_USERS_DB = [
    {"id": 1, "username": "alice", "tier": "Enterprise", "email": "alice@corp.com", "spend_limit": 5000},
    {"id": 2, "username": "bob", "tier": "Free", "email": "bob@personal.net", "spend_limit": 100},
    {"id": 3, "username": "charlie", "tier": "Pro", "email": "charlie@startup.io", "spend_limit": 1000}
]

def calculate_math(expression):
    """Safely evaluates basic arithmetic expressions."""
    print(f"   ⚙️  [Local Tool] Running calculate_math on: '{expression}'")
    # Clean expression to only allow arithmetic characters (security safety)
    cleaned = re.sub(r'[^0-9+\-*/().\s]', '', expression)
    try:
        # Use python's eval on safe/sanitized subset of arithmetic expressions
        result = eval(cleaned, {"__builtins__": None}, {})
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": f"Arithmetic error: {str(e)}"}

def query_database(table, query_filter=None):
    """Simulates querying a local SQL database of products or users."""
    print(f"   ⚙️  [Local Tool] Querying table '{table}' with filter: '{query_filter}'")
    
    if table == "products":
        db = MOCK_PRODUCTS_DB
    elif table == "users":
        db = MOCK_USERS_DB
    else:
        return {"status": "error", "message": f"Table '{table}' does not exist."}

    if not query_filter:
        return {"status": "success", "data": db}

    # Basic filter matching (case insensitive)
    filter_lower = str(query_filter).lower()
    matches = []
    for record in db:
        match_found = False
        for val in record.values():
            if filter_lower in str(val).lower():
                match_found = True
                break
        if match_found:
            matches.append(record)

    return {"status": "success", "count": len(matches), "data": matches}

def fetch_web_page(url):
    """Simulates fetching text content and specs from a webpage."""
    print(f"   ⚙️  [Local Tool] Fetching simulated URL: '{url}'")
    
    mock_sites = {
        "example.com/shipping-policy": {
            "title": "Example Corp Shipping Policy",
            "content": "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Enterprise customers get free overnight shipping on all orders over $100."
        },
        "example.com/warranty": {
            "title": "Warranty & Returns",
            "content": "All hardware has a 2-year warranty. Returns are accepted within 30 days of purchase for a full refund, except on audio items."
        }
    }
    
    # Strip protocol
    clean_url = url.replace("http://", "").replace("https://", "").replace("www.", "")
    
    if clean_url in mock_sites:
        return {"status": "success", "url": url, "data": mock_sites[clean_url]}
    
    return {
        "status": "success", 
        "url": url, 
        "data": {
            "title": "General Webpage",
            "content": "This is a generic mock page content. Standard rates apply. Consult custom policies for details."
        }
    }

# ─── Schema Declarations ─────────────────────────────────────────────────────

TOOLS_SCHEMAS = [
    {
        "name": "calculate_math",
        "description": "Evaluates simple mathematical expressions securely (e.g., '482 * 19' or '1024 / 4 + 7'). Use this for calculations rather than guessing.",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "The math expression to solve (e.g. '482 * 19'). Only basic arithmetic operations are supported."
                }
            },
            "required": ["expression"]
        }
    },
    {
        "name": "query_database",
        "description": "Queries the company database for details about 'products' (id, name, price, stock, category) or 'users' (id, username, tier, email, spend_limit).",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "enum": ["products", "users"],
                    "description": "The database table to query."
                },
                "query_filter": {
                    "type": "string",
                    "description": "A search keyword to filter database records (e.g. 'alice', 'keyboard', 'screens'). Optional."
                }
            },
            "required": ["table"]
        }
    },
    {
        "name": "fetch_web_page",
        "description": "Fetches page content, documentation, or policies from simulated internal web links (e.g. 'example.com/shipping-policy', 'example.com/warranty').",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The webpage URL to fetch."
                }
            },
            "required": ["url"]
        }
    }
]

def execute_tool(name, arguments):
    """Dispatches tool calls to the matching python implementation."""
    if name == "calculate_math":
        return calculate_math(arguments.get("expression", ""))
    elif name == "query_database":
        return query_database(arguments.get("table", ""), arguments.get("query_filter"))
    elif name == "fetch_web_page":
        return fetch_web_page(arguments.get("url", ""))
    else:
        return {"status": "error", "message": f"Tool '{name}' not found."}

# ─── Live Execution Loop ──────────────────────────────────────────────────────

def run_live_assistant(api_key, user_query):
    client = anthropic.Anthropic(api_key=api_key)
    # Using Claude 3 Haiku for tool use demonstration
    model_name = "claude-3-haiku-20240307"

    print("━━━ Step 1: 💬 Sending Query to Claude ━━━━━━━━━━━━━━━━━━")
    print(f"   User: '{user_query}'\n")

    messages = [{"role": "user", "content": user_query}]

    response = client.messages.create(
        model=model_name,
        max_tokens=1000,
        tools=TOOLS_SCHEMAS,
        messages=messages
    )

    # Loop to handle sequential tool calls (if Claude decides to use tools)
    while response.stop_reason == "tool_use":
        # Extract assistant content (which may contain text and tool uses)
        assistant_content = response.content
        messages.append({"role": "assistant", "content": assistant_content})

        # Process all tool use requests
        tool_results = []
        for block in assistant_content:
            if block.type == "tool_use":
                print(f"   🧠  Claude requests tool: {block.name}({json.dumps(block.input)})")
                
                # Execute tool locally
                output = execute_tool(block.name, block.input)
                
                print(f"   📥  Tool output captured: {json.dumps(output)}\n")
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(output)
                })

        # Send tool results back as user content
        messages.append({"role": "user", "content": tool_results})

        print("━━━ Step 2: 🔄 Returning Tool Outputs ━━━━━━━━━━━━━━━━━━")
        response = client.messages.create(
            model=model_name,
            max_tokens=1000,
            tools=TOOLS_SCHEMAS,
            messages=messages
        )

    print("━━━ Step 3: 📊 Synthesized Response ━━━━━━━━━━━━━━━━━━━━")
    # Output final response text
    print(response.content[0].text)

# ─── Simulator Mode (Fallback) ────────────────────────────────────────────────

def run_simulated_assistant(user_query):
    print("📢 ANTHROPIC_API_KEY not found. Running in SIMULATOR MODE.\n")
    print("━━━ Step 1: 💬 Sending Query to Simulator ━━━━━━━━━━━━━━")
    print(f"   User: '{user_query}'\n")

    # Hardcoded simulation scenarios based on query keywords
    query_lower = user_query.lower()
    
    if "keyboard" in query_lower or "mouse" in query_lower or "monitor" in query_lower or "product" in query_lower:
        # Scenario: DB Products lookup + Math calculation (tax or quantity discount)
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: query_database({'table': 'products', 'query_filter': 'keyboard'})\n")
        
        db_output = execute_tool("query_database", {"table": "products", "query_filter": "keyboard"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(db_output)}\n")
        
        print("   🧠  [Simulator Model] Found product. Now calculating total price with 10% tax...")
        print("   🧠  Simulator requests tool: calculate_math({'expression': '149.99 * 1.1'})\n")
        
        math_output = execute_tool("calculate_math", {"expression": "149.99 * 1.1"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(math_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Response ━━━━━━━━━━━━━━━━━━━━")
        print("I searched the company database for 'keyboard' and found the **Titanium Keyboard**:")
        print(f"- Price: $149.99")
        print(f"- Current Stock: 42 items available")
        print(f"- Price with 10% tax: ${math_output['result']:.2f}")
        print("\nLet me know if you would like me to process an order!")
        
    elif "shipping" in query_lower or "policy" in query_lower or "deliver" in query_lower:
        # Scenario: Web fetch for shipping policy + DB lookup for user tier
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: query_database({'table': 'users', 'query_filter': 'alice'})\n")
        
        db_output = execute_tool("query_database", {"table": "users", "query_filter": "alice"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(db_output)}\n")
        
        print("   🧠  [Simulator Model] User tier is Enterprise. Fetching corporate shipping guidelines...")
        print("   🧠  Simulator requests tool: fetch_web_page({'url': 'example.com/shipping-policy'})\n")
        
        web_output = execute_tool("fetch_web_page", {"url": "example.com/shipping-policy"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(web_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Response ━━━━━━━━━━━━━━━━━━━━")
        print("Based on the databases, customer **alice** is on the **Enterprise** tier.")
        print("According to our internal shipping guidelines:")
        print(f'"{web_output["data"]["content"]}"')
        print("\nTherefore, Alice qualifies for **free overnight shipping** on orders over $100.")
        
    else:
        # Generic Calculation Scenario
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: calculate_math({'expression': '1024 / 4 + 7'})\n")
        
        math_output = execute_tool("calculate_math", {"expression": "1024 / 4 + 7"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(math_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Response ━━━━━━━━━━━━━━━━━━━━")
        print(f"The calculation `1024 / 4 + 7` evaluates to **{math_output['result']}**.")

# ─── CLI Entry ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("═══════════════════════════════════════════════════════════")
    print("  🛠️  TOOL USE PATTERN — Smart Python Assistant")
    print("═══════════════════════════════════════════════════════════\n")

    # Default query if none provided
    query = "Check the database for a keyboard, and calculate its price with a 10% tax."
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if api_key and HAS_ANTHROPIC:
        try:
            run_live_assistant(api_key, query)
        except Exception as err:
            print(f"❌ Error during live run: {err}")
            print("Falling back to simulation...")
            run_simulated_assistant(query)
    else:
        if api_key and not HAS_ANTHROPIC:
            print("⚠️  Warning: ANTHROPIC_API_KEY is configured, but 'anthropic' SDK package is not installed.")
        run_simulated_assistant(query)
        
    print("\n═══════════════════════════════════════════════════════════")
    print("  ✅  Assistant loop completed!")
    print("═══════════════════════════════════════════════════════════\n")

#!/usr/bin/env python3
"""
Separate Tool Use Pattern — Personal Finance & Investment Advisor
================================================================

Demonstrates another application of the TOOL USE agentic design pattern:

  1. Client sends a financial query + available math/finance schemas to Claude.
  2. Claude determines what financial data to query or calculate.
  3. Claude requests local python execution (e.g. currency conversion, stock pricing, interest formulas).
  4. The client runs local functions and returns structured outputs to Claude.
  5. Claude synthesizes the numbers to formulate a comprehensive investment advice report.

"""

import os
import sys
import json
from dotenv import load_dotenv

# Try to import anthropic
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

load_dotenv()

# ─── Tool Implementations ─────────────────────────────────────────────────────

MOCK_STOCK_DB = {
    "AAPL": {"price": 175.50, "change": 1.25, "volume": 52000000, "currency": "USD"},
    "MSFT": {"price": 420.20, "change": -2.40, "volume": 23000000, "currency": "USD"},
    "GOOG": {"price": 150.10, "change": 0.45, "volume": 28000000, "currency": "USD"},
    "TSLA": {"price": 180.80, "change": 5.10, "volume": 88000000, "currency": "USD"},
    "NVDA": {"price": 875.00, "change": 12.30, "volume": 41000000, "currency": "USD"}
}

CURRENCY_RATES = {
    "USD_EUR": 0.92,
    "USD_GBP": 0.79,
    "USD_JPY": 155.00,
    "USD_CAD": 1.36,
    "EUR_USD": 1.09,
    "GBP_USD": 1.27,
    "JPY_USD": 0.0065,
    "CAD_USD": 0.74
}

def get_stock_quote(symbol):
    """Retrieves real-time mock price quotes and stats for a stock ticker symbol."""
    sym = symbol.upper().strip()
    print(f"   📈  [Finance Tool] Fetching stock quote for: '{sym}'")
    
    if sym in MOCK_STOCK_DB:
        return {"status": "success", "symbol": sym, "data": MOCK_STOCK_DB[sym]}
    
    return {
        "status": "error", 
        "message": f"Ticker symbol '{sym}' not found. Supported tickers: {', '.join(MOCK_STOCK_DB.keys())}"
    }

def convert_currency(amount, from_cur, to_cur):
    """Converts a currency amount to a target currency using simulated exchange rates."""
    f_cur = from_cur.upper().strip()
    t_cur = to_cur.upper().strip()
    print(f"   💱  [Finance Tool] Converting {amount} {f_cur} to {t_cur}")
    
    if f_cur == t_cur:
        return {"status": "success", "amount": amount, "currency": t_cur}
        
    rate_key = f"{f_cur}_{t_cur}"
    
    if rate_key in CURRENCY_RATES:
        converted = amount * CURRENCY_RATES[rate_key]
        return {
            "status": "success",
            "original_amount": amount,
            "original_currency": f_cur,
            "converted_amount": round(converted, 2),
            "converted_currency": t_cur,
            "rate": CURRENCY_RATES[rate_key]
        }
    
    # Try converting via USD as bridge
    try:
        to_usd_key = f"{f_cur}_USD"
        from_usd_key = f"USD_{t_cur}"
        
        # Default rate to 1.0 if same
        rate_to_usd = 1.0 if f_cur == "USD" else CURRENCY_RATES[to_usd_key]
        rate_from_usd = 1.0 if t_cur == "USD" else CURRENCY_RATES[from_usd_key]
        
        converted = amount * rate_to_usd * rate_from_usd
        effective_rate = rate_to_usd * rate_from_usd
        return {
            "status": "success",
            "original_amount": amount,
            "original_currency": f_cur,
            "converted_amount": round(converted, 2),
            "converted_currency": t_cur,
            "rate": round(effective_rate, 4)
        }
    except KeyError:
        return {"status": "error", "message": f"Exchange rate not found for {f_cur} to {t_cur}."}

def calculate_compound_interest(principal, rate, years, compounding_frequency=12):
    """Calculates compound interest savings projections."""
    print(f"   💸  [Finance Tool] Calculating compound interest: P={principal}, r={rate}%, t={years}yrs, n={compounding_frequency}")
    
    try:
        p = float(principal)
        r = float(rate) / 100.0
        t = float(years)
        n = int(compounding_frequency)
        
        # A = P * (1 + r/n)**(n*t)
        total = p * ((1 + r/n) ** (n * t))
        interest_earned = total - p
        
        return {
            "status": "success",
            "principal": p,
            "interest_rate_percent": rate,
            "years": t,
            "compounding_frequency": n,
            "total_balance": round(total, 2),
            "interest_earned": round(interest_earned, 2)
        }
    except Exception as e:
        return {"status": "error", "message": f"Calculation error: {str(e)}"}

# ─── Schema Declarations ─────────────────────────────────────────────────────

TOOLS_SCHEMAS = [
    {
        "name": "get_stock_quote",
        "description": "Retrieves the current stock price, daily change, and volume for a ticker symbol (e.g. 'AAPL', 'MSFT', 'GOOG', 'TSLA', 'NVDA').",
        "input_schema": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "The stock ticker symbol (e.g., 'AAPL')."
                }
            },
            "required": ["symbol"]
        }
    },
    {
        "name": "convert_currency",
        "description": "Converts currency values using standard live exchange rates. Supports USD, EUR, GBP, JPY, CAD.",
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "The numeric amount of money to convert."
                },
                "from_cur": {
                    "type": "string",
                    "description": "The source currency code (e.g. 'USD', 'EUR')."
                },
                "to_cur": {
                    "type": "string",
                    "description": "The target currency code (e.g. 'EUR', 'GBP')."
                }
            },
            "required": ["amount", "from_cur", "to_cur"]
        }
    },
    {
        "name": "calculate_compound_interest",
        "description": "Calculates compound interest for investment growth. Returns the final value and interest earned.",
        "input_schema": {
            "type": "object",
            "properties": {
                "principal": {
                    "type": "number",
                    "description": "The initial investment amount."
                },
                "rate": {
                    "type": "number",
                    "description": "The annual interest rate in percent (e.g., 5.5 for 5.5%)."
                },
                "years": {
                    "type": "number",
                    "description": "The investment duration in years."
                },
                "compounding_frequency": {
                    "type": "integer",
                    "description": "Number of compounding periods per year (e.g., 12 for monthly, 1 for annually, 4 for quarterly). Optional, defaults to 12."
                }
            },
            "required": ["principal", "rate", "years"]
        }
    }
]

def execute_tool(name, arguments):
    """Dispatches tool calls to financial implementations."""
    if name == "get_stock_quote":
        return get_stock_quote(arguments.get("symbol", ""))
    elif name == "convert_currency":
        return convert_currency(
            arguments.get("amount"),
            arguments.get("from_cur", ""),
            arguments.get("to_cur", "")
        )
    elif name == "calculate_compound_interest":
        return calculate_compound_interest(
            arguments.get("principal"),
            arguments.get("rate"),
            arguments.get("years"),
            arguments.get("compounding_frequency", 12)
        )
    else:
        return {"status": "error", "message": f"Tool '{name}' not found."}

# ─── Live Execution Loop ──────────────────────────────────────────────────────

def run_live_assistant(api_key, user_query):
    client = anthropic.Anthropic(api_key=api_key)
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

    while response.stop_reason == "tool_use":
        assistant_content = response.content
        messages.append({"role": "assistant", "content": assistant_content})

        tool_results = []
        for block in assistant_content:
            if block.type == "tool_use":
                print(f"   🧠  Claude requests tool: {block.name}({json.dumps(block.input)})")
                output = execute_tool(block.name, block.input)
                print(f"   📥  Tool output captured: {json.dumps(output)}\n")
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(output)
                })

        messages.append({"role": "user", "content": tool_results})

        print("━━━ Step 2: 🔄 Returning Tool Outputs ━━━━━━━━━━━━━━━━━━")
        response = client.messages.create(
            model=model_name,
            max_tokens=1000,
            tools=TOOLS_SCHEMAS,
            messages=messages
        )

    print("━━━ Step 3: 📊 Synthesized Financial Report ━━━━━━━━━━━━━")
    print(response.content[0].text)

# ─── Simulator Mode ───────────────────────────────────────────────────────────

def run_simulated_assistant(user_query):
    print("📢 ANTHROPIC_API_KEY not found. Running in SIMULATOR MODE.\n")
    print("━━━ Step 1: 💬 Sending Query to Simulator ━━━━━━━━━━━━━━")
    print(f"   User: '{user_query}'\n")

    query_lower = user_query.lower()
    
    if "convert" in query_lower or "currency" in query_lower or "usd" in query_lower or "eur" in query_lower:
        # Scenario: Currency conversion + stock quote
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: convert_currency({'amount': 500, 'from_cur': 'USD', 'to_cur': 'EUR'})\n")
        
        conv_output = execute_tool("convert_currency", {"amount": 500, "from_cur": "USD", "to_cur": "EUR"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(conv_output)}\n")
        
        print("   🧠  [Simulator Model] Converted currency. Now fetching stock ticker values for AAPL...")
        print("   🧠  Simulator requests tool: get_stock_quote({'symbol': 'AAPL'})\n")
        
        stock_output = execute_tool("get_stock_quote", {"symbol": "AAPL"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(stock_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Financial Report ━━━━━━━━━━━━━")
        print("Here is your requested financial data:")
        print(f"1. **Currency Exchange**:")
        print(f"   - Original: $500.00 USD")
        print(f"   - Converted: €{conv_output['converted_amount']} EUR (Rate: {conv_output['rate']})")
        print(f"2. **Stock Pricing**:")
        print(f"   - Ticker: AAPL (Apple Inc.)")
        print(f"   - Current Price: ${stock_output['data']['price']} USD")
        print(f"   - Daily Change: +{stock_output['data']['change']}%")
        print("\nLet me know if you would like me to compile interest projections for these values!")
        
    elif "interest" in query_lower or "compound" in query_lower or "grow" in query_lower:
        # Scenario: Compound interest calculation
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: calculate_compound_interest({'principal': 10000, 'rate': 6, 'years': 5, 'compounding_frequency': 12})\n")
        
        interest_output = execute_tool("calculate_compound_interest", {"principal": 10000, "rate": 6, "years": 5, "compounding_frequency": 12})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(interest_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Financial Report ━━━━━━━━━━━━━")
        print("Here is the projected savings growth over a **5-year** period:")
        print(f"- Initial Principal: ${interest_output['principal']:,}")
        print(f"- Annual Growth Rate: {interest_output['interest_rate_percent']}% compounded monthly")
        print(f"- **Final Projected Balance**: ${interest_output['total_balance']:,}")
        print(f"- Total Interest Accrued: ${interest_output['interest_earned']:,}")
        print("\nThis represents a strong compound curve. Would you like to review other interest rates?")
        
    else:
        # Scenario: General stock quote query
        print("   🧠  [Simulator Model] Analyzing request. Determining tool execution...")
        print("   🧠  Simulator requests tool: get_stock_quote({'symbol': 'MSFT'})\n")
        
        stock_output = execute_tool("get_stock_quote", {"symbol": "MSFT"})
        print(f"   📥  [Simulator Tool Output]: {json.dumps(stock_output)}\n")
        
        print("━━━ Step 2: 📊 Synthesized Financial Report ━━━━━━━━━━━━━")
        print(f"**MSFT** is currently trading at **${stock_output['data']['price']} USD** with a daily change of **{stock_output['data']['change']}%**.")

# ─── CLI Entry ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("═══════════════════════════════════════════════════════════")
    print("  💼  FINANCIAL ADVISOR TOOL — Personal Finance Assistant")
    print("═══════════════════════════════════════════════════════════\n")

    # Default query
    query = "Convert 500 USD to EUR and query the AAPL stock quote."
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
        run_simulated_assistant(query)
        
    print("\n═══════════════════════════════════════════════════════════")
    print("  ✅  Financial Assistant loop completed!")
    print("═══════════════════════════════════════════════════════════\n")

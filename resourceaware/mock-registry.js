/**
 * Mock Registry & Database
 * ========================
 * 
 * Provides mock data for financial analysis, a static zero-token cache
 * for fallback scenarios, and an active rate limiter that simulates
 * API rate limits (throwing HTTP 429).
 */

export const MOCK_DATABASE = {
  AAPL: {
    name: "Apple Inc.",
    ticker: "AAPL",
    sector: "Technology",
    price: 185.50,
    marketCap: "2.9T",
    peRatio: 28.4,
    revenueQtr: "90.8B",
    netIncomeQtr: "23.6B",
    highlights: [
      "Services revenue hit all-time high of $23.9B (+14.2% YoY).",
      "Active install base of devices crossed 2.2 billion units globally.",
      "Successfully launched Vision Pro headset, starting early spatial computing segment."
    ],
    risks: [
      "Soft iPhone sales in Greater China region due to increased domestic competition.",
      "Increasing regulatory scrutiny regarding App Store policies in EU and US.",
      "High valuation multiple relative to historical growth averages."
    ]
  },
  MSFT: {
    name: "Microsoft Corporation",
    ticker: "MSFT",
    sector: "Technology / Cloud",
    price: 420.25,
    marketCap: "3.1T",
    peRatio: 36.2,
    revenueQtr: "61.9B",
    netIncomeQtr: "21.9B",
    highlights: [
      "Azure and other cloud services grew 31% YoY, driven by AI integration.",
      "Copilot subscriptions driving higher ARPU across Microsoft 365 suites.",
      "Completed acquisition of Activision Blizzard, expanding gaming segment."
    ],
    risks: [
      "Hefty capital expenditures on AI data centers could compress margins in the short term.",
      "Anti-trust scrutiny over OpenAI partnership and cloud market dominance.",
      "Integration risks with the Activision Blizzard gaming portfolio."
    ]
  },
  TSLA: {
    name: "Tesla Inc.",
    ticker: "TSLA",
    sector: "Automotive / Clean Energy",
    price: 175.00,
    marketCap: "550B",
    peRatio: 45.1,
    revenueQtr: "21.3B",
    netIncomeQtr: "1.13B",
    highlights: [
      "Deploying Full Self-Driving (FSD) version 12 with neural-net-based vehicle control.",
      "Energy generation and storage business revenue grew 140% YoY.",
      "Preparing low-cost next-gen vehicle platform for production in late 2025."
    ],
    risks: [
      "Intensifying global EV price competition, especially from Chinese manufacturers like BYD.",
      "Operating margins compressed to 5.5% due to price cuts and AI infrastructure spending.",
      "Production delays or regulatory roadblocks for robotaxi deployment."
    ]
  },
  NVDA: {
    name: "NVIDIA Corporation",
    ticker: "NVDA",
    sector: "Semiconductors / AI",
    price: 950.00,
    marketCap: "2.3T",
    peRatio: 72.5,
    revenueQtr: "26.0B",
    netIncomeQtr: "14.8B",
    highlights: [
      "Data Center revenue surged 427% YoY to $22.6B on insatiable Hopper GPU demand.",
      "Announced new Blackwell GPU architecture with 30x faster inference capabilities.",
      "Gross margins reached record 78.4% due to pricing power and software revenue."
    ],
    risks: [
      "Extreme concentration of revenue in cloud hyperscalers creating demand vulnerability.",
      "Tight supply chain constraints on advanced packaging (CoWoS) limiting deliveries.",
      "Stringent export controls in major markets restricting shipments of advanced products."
    ]
  }
};

export const MOCK_REPORT_CACHE = {
  AAPL: `[CACHED REPORT - AAPL]
Apple Inc. (AAPL) Analysis: Stable tech giant with a market cap of $2.9T. Price: $185.50.
Strong Services segment ($23.9B) and device install base (2.2B) offset soft iPhone sales in China.
Regulator pressures are the primary mid-term threat. Neutral-to-Positive outlook.
Generated: 2 hours ago (Static Cache Fallback - 0 Tokens, 0s Latency)`,
  MSFT: `[CACHED REPORT - MSFT]
Microsoft Corp. (MSFT) Analysis: Cloud and AI titan at a $3.1T valuation. Price: $420.25.
Azure growth (+31% YoY) and AI Copilot lead the market. Substantial capex required for datacenters.
High valuation is backed by strong cash flow. Positive outlook.
Generated: 2 hours ago (Static Cache Fallback - 0 Tokens, 0s Latency)`,
  TSLA: `[CACHED REPORT - TSLA]
Tesla Inc. (TSLA) Analysis: High-beta EV and energy business valued at $550B. Price: $175.00.
FSD V12 and energy storage growth (+140%) provide long-term catalysts. Margin pressure (5.5%) from price war is an immediate risk.
Speculative Positive outlook.
Generated: 2 hours ago (Static Cache Fallback - 0 Tokens, 0s Latency)`,
  NVDA: `[CACHED REPORT - NVDA]
NVIDIA Corp. (NVDA) Analysis: AI hardware leader with market cap of $2.3T. Price: $950.00.
Incredible Data Center growth (+427% YoY) and Blackwell launch. Risks include customer concentration and supply bottlenecks.
Very Positive outlook, albeit with high valuation risk.
Generated: 2 hours ago (Static Cache Fallback - 0 Tokens, 0s Latency)`
};

export class MockRateLimiter {
  constructor(maxRequests = 2, timeWindowMs = 10000) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
    this.requestTimestamps = [];
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
    this.requestTimestamps = [];
  }

  disable() {
    this.enabled = false;
  }

  /**
   * Check if the request is rate-limited.
   * Throws an error (simulating HTTP 429) if limit is exceeded.
   */
  checkLimit() {
    if (!this.enabled) return;

    const now = Date.now();
    // Filter timestamps within the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.timeWindowMs
    );

    if (this.requestTimestamps.length >= this.maxRequests) {
      const waitTime = Math.ceil(
        (this.timeWindowMs - (now - this.requestTimestamps[0])) / 1000
      );
      throw new Error(`API_RATE_LIMIT_EXCEEDED: Rate limit triggered. Please wait ${waitTime} seconds. (Simulated HTTP 429)`);
    }

    this.requestTimestamps.push(now);
  }
}

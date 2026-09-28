# Lookthrough

**You hold 9 tokens. You own 5 bets. And you can't quickly sell 2 of them.**

Lookthrough is a portfolio tracker for people who hold crypto and tokenised real-world assets side by side: BTC next to tokenised gold, tokenised stocks and treasury tokens. Other tools rate one token at a time. Lookthrough answers questions about *your* portfolio:

- **What do my tokens really own?** Wrappers are regrouped by their underlying asset. BTC and WBTC are one bet on Bitcoin; PAXG and XAUT are one bet on gold.
- **Who am I trusting?** Tokenised assets depend on an issuer. Lookthrough shows when one issuer (for example Tether, behind both USDT and XAUT) stands behind a large share of your money.
- **Could I actually sell it?** Every position is compared with the token's real 24-hour trading volume on CoinMarketCap. A $16,000 position in a token that trades $95,000 a day takes days to sell without moving the price.

> Track: **Real World Assets** · Built for **Build with CMC: API Hackathon** · #BuildwithCMC

<!-- TODO: add the headline finding from the census once measured, e.g. "In X% of tokenised stocks on CoinMarketCap, a $5,000 position is more than a full day's volume." -->

**Live demo:** TODO_VERCEL_LINK · **Video:** TODO_VIDEO_LINK

![Lookthrough dashboard](docs/screenshot.png) <!-- TODO: add screenshot -->

## Try it in 30 seconds

1. Open the live demo.
2. Click **Try it with a sample portfolio**. Nine holdings load with live CoinMarketCap prices.
3. Read the verdict at the top, then the warnings, the two look-through bars, and the "Could you sell it?" table.
4. Open **CoinMarketCap calls behind this page** at the bottom to see every API call: endpoint, parameters, credits, and the raw JSON response.
5. Add your own holding by ticker (for example `PAXG`). Holdings are stored only in your browser.

## CoinMarketCap endpoints used

| Endpoint | Used for | Cache |
|---|---|---|
| `GET /v2/cryptocurrency/quotes/latest` | Price, 24h volume and 24h change for every holding, in one call per portfolio | 2 minutes |
| `GET /v1/cryptocurrency/map` | Turning tickers into CoinMarketCap IDs, and choosing between tokens that share a ticker | 24 hours |
| `GET /v1/key/info` | Health check of plan and credit usage (0 credits) | 30 seconds |

<!-- TODO: add RWA endpoints here if the Startup upgrade enables them -->

## Evidence of a real API call

The app shows every call in its API log panel. Example request made by the server:

```bash
curl -H "X-CMC_PRO_API_KEY: $CMC_API_KEY" \
  "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=1,4705&convert=USD"
```

<!-- TODO: paste a trimmed real response here (no API key!) -->

The code that makes it: [`lib/cmc-core.ts`](lib/cmc-core.ts) (HTTP call), [`lib/cmc.ts`](lib/cmc.ts) (cache and fallback), [`app/api/quotes/route.ts`](app/api/quotes/route.ts) (route).

## How it works

```
Browser (holdings in localStorage)
   │  /api/quotes?ids=…   /api/resolve   /api/symbol
   ▼
Next.js route handlers on Vercel  ── API key stays here
   │  1. in-memory cache (2 min for prices, 24 h for ID lookups)
   │  2. live call to CoinMarketCap
   │  3. if CoinMarketCap fails: committed snapshot, labelled as such
   ▼
pro-api.coinmarketcap.com
```

- **Look-through mapping** ([`lib/underlying.ts`](lib/underlying.ts)): a documented table from token to underlying asset and issuer. Tokenised stocks named "… xStock" are recognised automatically. Anything unknown counts as its own bet.
- **Exit check** ([`lib/exitCheck.ts`](lib/exitCheck.ts)): days to sell = position value ÷ (10% of 24h volume). 10% is a common rule of thumb for selling without moving the price; the UI says so.
- **Honest data labels:** every response records whether it was live, reused from the cache, or served from the snapshot. The header shows how fresh the prices are.

## Reliability during judging

The hackathon's Startup-tier access ends when submissions close, before judging. To keep the demo working, `npm run snapshot` saves real CoinMarketCap responses for the sample portfolio into `data/snapshots.json`. If a live call fails, the app serves that snapshot and says so on screen ("Saved snapshot, CoinMarketCap unreachable"). Nothing is presented as live when it is not.

## Run it locally

Requires Node.js 20+.

```bash
git clone https://github.com/TODO_USER/lookthrough.git
cd lookthrough
npm install
cp .env.example .env.local   # then put your CMC API key in .env.local
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm test           # unit tests for look-through, exit check and response parsing
npm run lint
npm run snapshot   # refresh data/snapshots.json from the live API
```

The API key is read only on the server from `CMC_API_KEY` and is never sent to the browser or committed.

## What the API made possible, and where it got in the way

**Made possible:** one quotes call covers a whole portfolio, including tokenised gold and stocks listed as regular assets, so live value and liquidity checks cost about one credit per refresh. Reported 24h volume is what turns a price tracker into an answer to "could I sell this?".

**Got in the way:**
<!-- TODO: fill in honestly from real experience. Candidates so far: -->
- Hackathon Startup upgrade: TODO (e.g. still on the free tier N days after registering; support ticket opened).
- RWA endpoints: TODO (e.g. `/v5/real-world-assets/map` returned HTTP 402, error 1003, on our key).
- Ticker collisions: many tokens share a symbol, so `map` must be used to pick the right one; there is no field linking a wrapper to its underlying asset or issuer on the regular quotes endpoints, which is why Lookthrough keeps its own mapping.
- 24h volume is a single aggregate. Per-venue depth would make the exit check far more precise.

## Limitations

- Buy prices in the sample portfolio are illustrative.
- The underlying/issuer mapping covers common assets; unknown tokens are treated as their own bet.
- Volume is CoinMarketCap's reported 24h total and can include low-quality venues. Not financial advice.

## License

MIT

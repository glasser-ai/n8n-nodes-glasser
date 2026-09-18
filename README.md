# n8n-nodes-glasser

Premium data for n8n workflows and AI Agents through **one Glasser Key**: find people, company intelligence, SEO research, web research, social research and market data, backed by Apollo, People Data Labs, Hunter, BuiltWith, DataForSEO, Semrush, Ahrefs, Serper, Exa, ScrapeCreators, RentCast and more. The node says what data it wants; Glasser decides which provider serves it. Pay per call, no signup at each vendor.

One node, one credential. `usableAsTool` is on, so the same node works as a step in a workflow and as a tool under an AI Agent.

## Resources and operations

| Resource | Operations | Providers behind it |
|---|---|---|
| **Person** | Search people, Enrich a person, Find a work email | Apollo, People Data Labs, LeadMagic, ZoomInfo, Hunter, Prospeo |
| **Company** | Enrich, Technology stack, Website traffic, Competitors, Funding rounds, News | Apollo, PDL, Hunter, Prospeo, PredictLeads, LeadMagic, BuiltWith, DataForSEO, Ahrefs, Apify, Exa, Serper |
| **SEO** | Keyword metrics, Keyword ideas, Search results for a keyword, Domain organic overview, Ranked keywords, Organic search competitors, Backlink totals, Backlinks, Referring domains, Domain rating | Semrush, Serpstat, DataForSEO, Ahrefs, Serper |
| **Web Research** | Search the web, News, Places, Academic papers, Shopping, Images, Videos, Answer from the web, Read a web page, Similar pages | Serper, SerpApi, Exa, DataForSEO |
| **Social** | Platform (Reddit, X, YouTube, TikTok, Instagram, LinkedIn) × Mode (Search, Profile, Recent posts, One post, Find social profiles) | ScrapeCreators, Apify, TikHub |
| **Market Data** | Property value estimate, Rent estimate, Property records, Listings for sale, Rental listings, ZIP market statistics, Stock quote | RentCast, SerpApi |

Every resource has a **Provider** field. `Auto` (the default) lets Glasser pick the source for the operation and fall back to the next one on a provider error; naming a provider forces it.

## How a call works

1. The node sends its parameters as they are to `POST https://api.glasser.ai/v1/solutions/gtm/<resource>` with a fresh idempotency key. Comma-separated fields become arrays; nothing else is changed.
2. Glasser resolves `(operation, provider)` to one endpoint, translates the fields into that endpoint's native input, runs it, and under `Auto` moves to the next source on a provider error. It never falls back on an empty answer: "no result" is an answer.
3. The output item is the run exactly as the Glasser API returns it: `provider` and `endpoint` say who served the call, `input` is what was sent, `output` is the provider's own payload, `charge_usd` is the exact charge as a decimal string, `run_url` opens it in the console. An async run is polled until it is terminal (up to 180 seconds).

The node holds no routing table and no state. Its parameters are generated from the Glasser OpenAPI document (`scripts/gen-properties.mjs`), so they cannot drift from the API.

## Credentials

1. Sign in at https://app.glasser.ai, open **Keys**, create a Key (it starts with `gl_`). The workspace needs a balance: runs are prepaid and charged per call.
2. In n8n, add a **Glasser API** credential and paste the Key. The credential test calls `GET /v1/balance`, which is free.

## Example workflow

`examples/glasser-demo.json` is a workflow to import (Workflow menu → Import from file): it finds the CTO of a domain, looks up that person's work email, searches the web and reads a domain rating. Pick your Glasser API credential on each node and execute.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. Package name: `n8n-nodes-glasser`.

## Usage notes

- **Each call is one paid run** at the routed endpoint's published price. Under `Auto` a provider error can lead to a second run at the next source; each run is billed under its own terms and all of them are visible in the Glasser console.
- **Two indicators, not one.** A run's `status` and the provider's response are separate. A `COMPLETED` run whose provider answered 404 ("person not found") is a normal outcome, charged per the endpoint's clauses (`charge_basis.clause`).
- **Errors are the API's own envelope.** A refused request (unknown country, a filter the named provider cannot apply, a provider that does not serve the operation) is raised with Glasser's error code and message; nothing was run and nothing was charged.
- **Money is an exact decimal string** (`"0.0005"`), never a float.

## Development

```sh
npm install
npm run gen                # regenerate nodes/Glasser/properties.ts from https://glasser.ai/docs/openapi.json
npm run lint
npm run build
npm run dev                # local n8n with the node loaded
```

## Support

- Source repository: https://github.com/glasser-ai/n8n-nodes-glasser
- Glasser documentation: https://glasser.ai/docs
- Console: https://app.glasser.ai
- Contact: support@glasser.ai

## License

[MIT](LICENSE.md)

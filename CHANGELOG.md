# Changelog

## 0.2.2

- SEO gains the seven operations the API added: Site audit, Page audit, Keyword gap, Backlink gap, AI visibility, AI citations and Visibility history. Keyword gap and Backlink gap take `Competitors` (one to four domains, comma-separated); Page audit takes a `URL`.
- Web Research exposes the inputs the API added for Read a web page (`Formats`, `Timeout`, `Max Charge`, `Cache Max Age`) and for Search the web (`Time Range`), plus `Language`, under Additional Fields.
- `Limit` is available under Additional Fields on every operation that returns a list. The API caps it per route, so a value above the route's cap is clamped, not refused.
- Operation descriptions that the API states as a bullet list now read as one paragraph in the form.
- Existing parameter paths are unchanged; a 0.2.x workflow keeps working.

## 0.2.1

- Poll a Solution call through its `result_url`. Glasser now returns a normalized Solution response for every resource except Person (fixed `output` fields whichever provider served the call, `result_status`, the chain-total `charge_usd`, `runs`). An in-flight call used to be polled at `GET /v1/runs/{id}`, which returns the native run, so a workflow saw one shape when the call finished within the request and another when it had to wait. The node now follows the `result_url` the response carries, on the API origin only and after checking its path, and keeps `GET /v1/runs/{id}` for a response without one.
- Send the `User-Agent` on the polling requests too.
- No parameter changes; a 0.2.0 workflow keeps working.

## 0.2.0

The node's form is laid out the way n8n's UX guidelines ask, which the n8n Cloud manual review required: only an operation's required inputs sit at the top level, everything optional is folded into a collection. Parameter paths changed, so a workflow built on 0.1.x has to have its Glasser nodes configured again.

- Each operation shows only its own inputs, marked required: `Query` for the search-type web operations and `URL` for Read a Web Page / Similar Pages; `Keywords` for the keyword SEO operations and `Domain` for the domain ones; `Address`, `ZIP Code` or `Symbol` for the market operations that take exactly one; `Query`, `Handle` or `URL` per social operation.
- Where the contract accepts one of several identifiers, a selector picks it: **Lookup By** (LinkedIn URL / Email / Name and Company) for Enrich a person, **Search By** (Address / City and State / ZIP Code) for Property Records and the two listings operations. The selector shapes the form and is not sent to the API.
- Optional inputs live in collections: **Filters** for Search people (`job_titles`, `seniorities`, `locations`, `company_domain`), **Additional Fields** for `country`, and **Options** for `provider` on every resource.
- Social: the `Mode` dropdown is now `Operation`, like every other resource, with an action phrase per operation for AI Agents; the value is still sent as `mode`. Find Social Profiles asks for a `Query` on Reddit and a `Handle` elsewhere, as the contract states.
- The layout is a table in `scripts/gen-properties.mjs` next to the display names; field names, types, enums and descriptions still come from the OpenAPI document. The generator refuses a layout that leaves an operation uncovered or a contract-required field optional.
- Build: drop TypeScript's incremental cache. With the cache kept outside `dist/`, a build after `dist/` was cleaned re-emitted only the changed files and left `credentials/` and `package.json` out of `dist/`; a release built from that state would have shipped a node without its credential.

## 0.1.3

- Rewrite the `USER_AGENT` doc comment in English. n8n Cloud's manual review requires every code comment to be in English; no functional change.
- Social: the `pdl` provider the contract now offers, and the `Mode` description the contract now carries. Regenerating `properties.ts` picked both up; the node had drifted from the API.
- Seniorities: label the options `VP` and `C-Suite` instead of the `Vp` and `C Suite` the generic title-caser produced, and drop the enum list the dropdown already shows from the description. A dropdown built from the contract no longer repeats its own values.
- Keep the TypeScript build cache out of `dist/`. The published tarball drops from 72 kB to 15 kB.

## 0.1.2

- Send the package version in the `User-Agent` header: `n8n-nodes-glasser/<version> (+repo)`, the RFC 9110 product-token form. Glasser could previously tell the channel but not which release a user runs.

## 0.1.1

- Codex: rename the `Marketing` category to `Marketing & Content` (the name n8n's category list recognises) and add `Analytics` for the SEO metrics and market statistics. No functional change; the rename was required by the n8n Cloud manual review.

## 0.1.0

- First release: one Glasser node with six resources (Person, Company, SEO, Web Research, Social, Market Data), one credential, `usableAsTool`. Each operation is one call to `POST /v1/solutions/gtm/<resource>`; routing, translation and fallback live in the Glasser API.

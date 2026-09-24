# Changelog

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

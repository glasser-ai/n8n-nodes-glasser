# Changelog

## 0.1.3

- Rewrite the `USER_AGENT` doc comment in English. n8n Cloud's manual review requires every code comment to be in English; no functional change.

## 0.1.2

- Send the package version in the `User-Agent` header: `n8n-nodes-glasser/<version> (+repo)`, the RFC 9110 product-token form. Glasser could previously tell the channel but not which release a user runs.

## 0.1.1

- Codex: rename the `Marketing` category to `Marketing & Content` (the name n8n's category list recognises) and add `Analytics` for the SEO metrics and market statistics. No functional change; the rename was required by the n8n Cloud manual review.

## 0.1.0

- First release: one Glasser node with six resources (Person, Company, SEO, Web Research, Social, Market Data), one credential, `usableAsTool`. Each operation is one call to `POST /v1/solutions/gtm/<resource>`; routing, translation and fallback live in the Glasser API.

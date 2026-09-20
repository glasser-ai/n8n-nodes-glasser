# Changelog

## 0.1.1

- Codex: rename the `Marketing` category to `Marketing & Content` (the name n8n's category list recognises) and add `Analytics` for the SEO metrics and market statistics. No functional change; the rename was required by the n8n Cloud manual review.

## 0.1.0

- First release: one Glasser node with six resources (Person, Company, SEO, Web Research, Social, Market Data), one credential, `usableAsTool`. Each operation is one call to `POST /v1/solutions/gtm/<resource>`; routing, translation and fallback live in the Glasser API.

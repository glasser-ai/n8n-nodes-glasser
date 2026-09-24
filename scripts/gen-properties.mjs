#!/usr/bin/env node
// Generate nodes/Glasser/properties.ts from the Glasser OpenAPI document.
//
// The contract is the single truth for the node's parameters: field names,
// types, enums, which are required, the default action, and the description
// the user (and an AI Agent using the node as a tool) reads all come from the
// request schema of POST /v1/solutions/gtm/<capability>. This script only
// adds what n8n needs on top: display names, and which fields each resource
// shows (the same subset the Dify plugin shows).
//
// Run at development time, commit the output:
//
//   node scripts/gen-properties.mjs                                  # public document
//   node scripts/gen-properties.mjs ../glasser/packages/contract/openapi.json
//
// n8n only ever sees the committed TypeScript; nothing is fetched at runtime.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPENAPI_URL = 'https://glasser.ai/docs/openapi.json';
const SOLUTION = 'gtm';
const PATH_PREFIX = `/v1/solutions/${SOLUTION}/`;

// ------------------------------------------------------------ resources
// Order is the order in the Resource dropdown.
const RESOURCES = {
	people_search: { name: 'Person', fields: ['action', 'provider', 'job_titles', 'seniorities', 'locations', 'company_domain', 'full_name', 'email', 'linkedin_url'] },
	company_intelligence: { name: 'Company', fields: ['action', 'provider', 'domain', 'country'] },
	seo_research: { name: 'SEO', fields: ['action', 'provider', 'keywords', 'domain', 'country'] },
	web_research: { name: 'Web Research', fields: ['action', 'provider', 'query', 'url', 'country'] },
	social_research: { name: 'Social', fields: ['platform', 'mode', 'provider', 'query', 'handle', 'url'] },
	market_data: { name: 'Market Data', fields: ['action', 'provider', 'address', 'city', 'state', 'zip', 'symbol'] },
};

// Display names per field. Text the OpenAPI document does not carry.
const FIELDS = {
	action: 'Operation',
	provider: 'Provider',
	platform: 'Platform',
	mode: 'Mode',
	query: 'Query',
	url: 'URL',
	domain: 'Domain',
	keywords: 'Keywords',
	country: 'Country',
	job_titles: 'Job Titles',
	seniorities: 'Seniorities',
	locations: 'Locations',
	company_domain: 'Company Domain',
	full_name: 'Full Name',
	email: 'Email',
	linkedin_url: 'LinkedIn URL',
	handle: 'Handle',
	address: 'Address',
	city: 'City',
	state: 'State',
	zip: 'ZIP Code',
	symbol: 'Symbol',
};

// Fallback descriptions for fields whose schema carries none.
const FIELD_DESCRIPTIONS = {
	query: 'Search phrase or question.',
	url: 'A full http(s) URL.',
	domain: 'A company website domain, e.g. stripe.com.',
	keywords: "Keywords to look up, e.g. 'espresso machine'.",
	'people_search.keywords': 'Free-text keywords for people search.',
	country: 'Two-letter country code or country name, e.g. us, gb, Germany (default us).',
	job_titles: "Job titles, e.g. 'CTO, VP Engineering'.",
	seniorities: 'Seniority levels.',
	locations: 'Cities, states or countries.',
	company_domain: "The employer's website domain, e.g. stripe.com.",
	full_name: "The person's full name, e.g. 'Patrick Collison'.",
	email: "The person's email address.",
	linkedin_url: "The person's LinkedIn profile URL.",
	handle: 'A username or handle without @, or a subreddit name.',
	address: "US street address, e.g. '5500 Grand Lake Dr, San Antonio, TX 78244'.",
	city: 'US city name; use with state.',
	state: 'Two-letter US state code, e.g. TX.',
	zip: 'Five-digit US ZIP code.',
	symbol: 'Ticker with exchange, e.g. AAPL:NASDAQ.',
};

// Labels for enum values. A value with no entry is title-cased.
const OPTIONS = {
	auto: 'Auto (Glasser Picks)',
	apollo: 'Apollo', pdl: 'People Data Labs', hunter: 'Hunter', prospeo: 'Prospeo', leadmagic: 'LeadMagic',
	zoominfo: 'ZoomInfo', predictleads: 'PredictLeads', builtwith: 'BuiltWith', dataforseo: 'DataForSEO',
	ahrefs: 'Ahrefs', semrush: 'Semrush', serpstat: 'Serpstat', serper: 'Serper', serpapi: 'SerpApi',
	exa: 'Exa', apify: 'Apify', scrapecreators: 'ScrapeCreators', tikhub: 'TikHub', rentcast: 'RentCast',
	// operations
	search: 'Search', enrich: 'Enrich', find_email: 'Find Work Email',
	tech_stack: 'Technology Stack', traffic: 'Website Traffic', competitors: 'Competitors', funding: 'Funding Rounds', news: 'News',
	keyword_overview: 'Keyword Metrics', keyword_ideas: 'Keyword Ideas', serp: 'Google Results for a Keyword',
	domain_overview: 'Domain Organic Overview', ranked_keywords: 'Ranked Keywords', organic_competitors: 'Organic Search Competitors',
	backlinks_overview: 'Backlink Totals', backlinks: 'Backlinks List', referring_domains: 'Referring Domains', domain_rating: 'Domain Rating',
	places: 'Places', scholar: 'Academic Papers', shopping: 'Shopping', images: 'Images', videos: 'Videos',
	answer: 'Answer From the Web', scrape: 'Read a Web Page', similar: 'Similar Pages',
	reddit: 'Reddit', x: 'X', youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', linkedin: 'LinkedIn',
	profile: 'Profile', feed: 'Recent Posts', post: 'One Post', find: 'Find Social Profiles',
	// seniorities: titleCase() would render these as 'Vp' and 'C Suite'
	vp: 'VP', c_suite: 'C-Suite',
	property_value: 'Property Value Estimate', property_rent: 'Rent Estimate', property_search: 'Property Records',
	listings_sale: 'For-Sale Listings', listings_rental: 'Rental Listings', market_stats: 'ZIP Market Statistics', stock_quote: 'Stock Quote',
};

// ---------------------------------------------------------- generation

async function loadOpenapi(source) {
	if (/^https?:\/\//.test(source)) {
		const response = await fetch(source);
		if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
		return response.json();
	}
	return JSON.parse(readFileSync(source, 'utf8'));
}

/** Strip the `anyOf [X, null]` an optional field is encoded as. */
function unwrap(prop) {
	if (prop.anyOf) {
		const branches = prop.anyOf.filter((b) => b.type !== 'null');
		if (branches.length === 1) return branches[0];
	}
	return prop;
}

/** The default the contract states as 'Default <value>.' in a description. */
function defaultOf(schema, resource, name) {
	const match = /^Default (\w+)\./.exec(schema.description ?? '');
	if (!match) return null;
	if (!schema.enum.includes(match[1])) throw new Error(`${resource}.${name}: default ${match[1]} is not in ${schema.enum}`);
	return match[1];
}

function titleCase(value) {
	return value.split(/[_\s]+/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function label(value) {
	return OPTIONS[value] ?? titleCase(value);
}

/**
 * n8n's description rules: a single sentence carries no final period, several
 * sentences keep theirs; first character uppercase; "URL" spelled as such.
 */
function describe(text) {
	let t = text.trim().replace(/\burl\b/g, 'URL').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	t = t[0].toUpperCase() + t.slice(1);
	// "e.g." and "i.e." are not sentence ends.
	const sentences = t.replace(/\b(e\.g\.|i\.e\.)/g, 'xx').split(/(?<=[.!?])\s+/).length;
	if (sentences === 1) t = t.replace(/[.]$/, '');
	return t;
}

/**
 * A dropdown already shows every value it accepts, so the contract's trailing
 * ", one or more of a, b, c" clause only repeats it in the user's own words.
 */
function withoutEnumList(text) {
	return text.replace(/,\s*one (?:or more )?of\s+[^.]*/i, '');
}

function sentenceCase(text) {
	const words = text.split(' ');
	return words
		.map((w, i) => (i === 0 || /^[A-Z]{2,}/.test(w) || /^[A-Z][a-z]+[A-Z]/.test(w) ? w : w.toLowerCase()))
		.join(' ');
}

/** The verb phrase an AI Agent sees for an operation ("Search people"). */
const ACTIONS = {
	'people_search.search': 'Search people',
	'people_search.enrich': 'Enrich a person',
	'people_search.find_email': 'Find a work email',
	'company_intelligence.enrich': 'Enrich a company',
	'company_intelligence.tech_stack': 'Get the technology stack',
	'company_intelligence.traffic': 'Get website traffic',
	'company_intelligence.competitors': 'Get competitors',
	'company_intelligence.funding': 'Get funding rounds',
	'company_intelligence.news': 'Get company news',
	'seo_research.keyword_overview': 'Get keyword metrics',
	'seo_research.keyword_ideas': 'Get keyword ideas',
	'seo_research.serp': 'Get search results for a keyword',
	'seo_research.domain_overview': 'Get a domain organic overview',
	'seo_research.ranked_keywords': 'Get ranked keywords',
	'seo_research.organic_competitors': 'Get organic search competitors',
	'seo_research.backlinks_overview': 'Get backlink totals',
	'seo_research.backlinks': 'List backlinks',
	'seo_research.referring_domains': 'List referring domains',
	'seo_research.domain_rating': 'Get domain rating',
	'web_research.search': 'Search the web',
	'web_research.news': 'Search news',
	'web_research.places': 'Search places',
	'web_research.scholar': 'Search academic papers',
	'web_research.shopping': 'Search shopping',
	'web_research.images': 'Search images',
	'web_research.videos': 'Search videos',
	'web_research.answer': 'Answer a question from the web',
	'web_research.scrape': 'Read a web page',
	'web_research.similar': 'Find similar pages',
	'market_data.property_value': 'Estimate a property value',
	'market_data.property_rent': 'Estimate rent',
	'market_data.property_search': 'Search property records',
	'market_data.listings_sale': 'List listings for sale',
	'market_data.listings_rental': 'List rental listings',
	'market_data.market_stats': 'Get ZIP market statistics',
	'market_data.stock_quote': 'Get a stock quote',
};

function buildProperty(resource, name, prop, required) {
	const schema = unwrap(prop);
	const displayName = FIELDS[name];
	if (!displayName) throw new Error(`${resource}.${name}: no display name in FIELDS; add one`);
	const raw = schema.description ?? FIELD_DESCRIPTIONS[`${resource}.${name}`] ?? FIELD_DESCRIPTIONS[name];
	const description = raw === undefined ? undefined : describe(raw);
	const dropdownDescription = raw === undefined ? undefined : describe(withoutEnumList(raw));
	const base = { displayName, name, required: required || undefined, description, displayOptions: { show: { resource: [resource] } } };

	if (schema.enum) {
		const isOperation = name === 'action';
		const options = schema.enum
			.map((value) => ({
				name: label(value),
				value,
				...(isOperation ? { action: ACTIONS[`${resource}.${value}`] ?? sentenceCase(label(value)) } : {}),
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
		const fallback = defaultOf(schema, resource, name) ?? (name === 'provider' ? 'auto' : schema.enum[0]);
		return {
			...base,
			description: dropdownDescription,
			name: isOperation ? 'operation' : name,
			type: 'options',
			noDataExpression: isOperation || name === 'platform' || name === 'mode' || undefined,
			options,
			default: fallback,
		};
	}
	if (schema.type === 'array') {
		const items = schema.items ?? {};
		if (items.enum) {
			return {
				...base,
				description: dropdownDescription,
				type: 'multiOptions',
				options: items.enum.map((value) => ({ name: label(value), value })).sort((a, b) => a.name.localeCompare(b.name)),
				default: [],
			};
		}
		const n = schema.maxItems ?? 20;
		return { ...base, type: 'string', default: '', description: describe(`${raw ?? displayName}. Comma-separated, up to ${n}.`) };
	}
	if (schema.type === 'integer') {
		return {
			...base,
			type: 'number',
			default: schema.minimum ?? 1,
			typeOptions: { minValue: schema.minimum, maxValue: schema.maximum },
		};
	}
	return { ...base, type: 'string', default: '', ...(name === 'email' ? { placeholder: 'name@email.com' } : {}) };
}

function serialize(value, indent = '') {
	return JSON.stringify(value, null, '\t')
		.split('\n')
		.map((line, i) => (i === 0 ? line : indent + line))
		.join('\n')
		.replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:');
}

async function main(source) {
	const openapi = await loadOpenapi(source);
	const tools = {};
	for (const [path, item] of Object.entries(openapi.paths)) {
		if (path.startsWith(PATH_PREFIX) && item.post) tools[path.slice(PATH_PREFIX.length)] = item.post;
	}
	for (const resource of Object.keys(RESOURCES)) {
		if (!tools[resource]) throw new Error(`${source} has no ${PATH_PREFIX}${resource}`);
	}

	const properties = [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: Object.entries(RESOURCES)
				.map(([value, r]) => ({ name: r.name, value }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			default: 'people_search',
		},
	];
	const meta = {};
	for (const [resource, spec] of Object.entries(RESOURCES)) {
		const schema = tools[resource].requestBody.content['application/json'].schema;
		const required = new Set(schema.required ?? []);
		const missing = spec.fields.filter((f) => !(f in schema.properties));
		if (missing.length) throw new Error(`${resource}: fields ${missing} are not in the request schema`);
		for (const r of required) if (!spec.fields.includes(r)) throw new Error(`${resource}: required field ${r} is not listed`);
		const lists = [];
		for (const name of spec.fields) {
			const prop = schema.properties[name];
			properties.push(buildProperty(resource, name, prop, required.has(name)));
			const s = unwrap(prop);
			if (s.type === 'array' && !(s.items ?? {}).enum) lists.push(name);
		}
		meta[resource] = { lists, hasOperation: spec.fields.includes('action') };
	}

	const out = `// Generated by scripts/gen-properties.mjs from the Glasser OpenAPI document. Do not edit.
import type { INodeProperties } from 'n8n-workflow';

/** Solution the node calls: POST /v1/solutions/${SOLUTION}/<resource>. */
export const SOLUTION = '${SOLUTION}';

/** Per resource: which string fields the API takes as arrays (the node splits commas). */
export const RESOURCE_META: Record<string, { lists: string[]; hasOperation: boolean }> = ${serialize(meta)};

export const properties: INodeProperties[] = ${serialize(properties)};
`;
	const target = resolve(ROOT, 'nodes/Glasser/properties.ts');
	writeFileSync(target, out);
	// Prettier turns the JSON-shaped literal into the project's style (single quotes, trailing commas).
	execFileSync('npx', ['prettier', '--write', target], { cwd: ROOT, stdio: 'ignore' });
	console.log(`wrote ${target} (${properties.length} properties)`);
}

main(process.argv[2] ?? OPENAPI_URL).catch((error) => {
	console.error(error.message);
	process.exit(1);
});

import { randomUUID } from 'node:crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, sleep } from 'n8n-workflow';

import { properties, RESOURCE_META, SOLUTION } from './properties';

const BASE_URL = 'https://api.glasser.ai';
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'STOPPED']);
const CREATE_TIMEOUT_MS = 120_000;
const WAIT_BUDGET_MS = 180_000;
const POLL_MS = 2_000;

/**
 * One node, one call per item: POST /v1/solutions/gtm/<resource>.
 *
 * Programmatic rather than declarative because a run can come back in flight
 * (202) and has to be polled to its terminal state, and because every call
 * needs a fresh Idempotency-Key. Routing to a provider, parameter translation
 * and fallback all happen in the Glasser API; the node adds nothing.
 */
export class Glasser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Glasser',
		name: 'glasser',
		icon: { light: 'file:glasser.svg', dark: 'file:glasser.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] || $parameter["mode"] }}: {{ $parameter["resource"] }}',
		description:
			'Premium data for people, companies, SEO, the web, social media and markets through one Glasser Key. Say what data you want; Glasser picks the provider.',
		defaults: {
			name: 'Glasser',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'glasserApi',
				required: true,
			},
		],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const body = requestBody.call(this, resource, i);
				const run = await callSolution.call(this, resource, body);
				returnData.push({ json: run, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/**
 * The contract's request body from the node's parameters: blanks dropped,
 * comma-separated strings split for the fields the API takes as arrays.
 * Everything else is the API's to validate, so its own error reaches the user.
 */
function requestBody(this: IExecuteFunctions, resource: string, itemIndex: number): IDataObject {
	const meta = RESOURCE_META[resource];
	const body: IDataObject = {};
	for (const property of properties) {
		const shown = property.displayOptions?.show?.resource as string[] | undefined;
		if (!shown || !shown.includes(resource)) continue;
		const raw = this.getNodeParameter(property.name, itemIndex, '') as unknown;
		if (raw === undefined || raw === null || raw === '') continue;
		if (Array.isArray(raw)) {
			if (raw.length > 0) body[property.name] = raw;
			continue;
		}
		const name = property.name === 'operation' ? 'action' : property.name;
		if (meta.lists.includes(name)) {
			const parts = String(raw)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (parts.length > 0) body[name] = parts;
			continue;
		}
		body[name] = typeof raw === 'string' ? raw.trim() : (raw as IDataObject[keyof IDataObject]);
	}
	return body;
}

/**
 * POST the solution call and, when the run is still in flight, poll
 * GET /v1/runs/{id} until it is terminal or the budget is spent. The
 * Idempotency-Key is generated once per call, so a transport retry inside
 * n8n's request helper reads the original run instead of paying twice.
 */
async function callSolution(
	this: IExecuteFunctions,
	resource: string,
	body: IDataObject,
): Promise<IDataObject> {
	const request: IHttpRequestOptions = {
		method: 'POST',
		url: `${BASE_URL}/v1/solutions/${SOLUTION}/${resource}`,
		headers: {
			'Idempotency-Key': randomUUID(),
			'User-Agent': 'n8n-nodes-glasser (+https://github.com/glasser-ai/n8n-nodes-glasser)',
		},
		body,
		json: true,
		timeout: CREATE_TIMEOUT_MS,
	};
	let run = await send.call(this, request);

	const deadline = Date.now() + WAIT_BUDGET_MS;
	while (!TERMINAL.has(String(run.status)) && Date.now() < deadline) {
		await sleep(POLL_MS);
		run = await send.call(this, {
			method: 'GET',
			url: `${BASE_URL}/v1/runs/${encodeURIComponent(String(run.id))}`,
			json: true,
		});
	}
	return run;
}

/**
 * One authenticated request. A non-2xx answer carries the API's own error
 * envelope ({ error: { code, message, details }, request_id }); it is raised
 * with that message and code so the user sees what Glasser said, not a
 * generic HTTP failure.
 */
async function send(this: IExecuteFunctions, request: IHttpRequestOptions): Promise<IDataObject> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'glasserApi', {
		...request,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: IDataObject };
	if (response.statusCode >= 200 && response.statusCode < 300) return response.body;
	const envelope = response.body ?? {};
	const error = (envelope.error ?? {}) as { code?: string; message?: string };
	throw new NodeApiError(this.getNode(), envelope as JsonObject, {
		httpCode: String(response.statusCode),
		message: error.code ? `${error.code}: ${error.message ?? ''}`.trim() : `HTTP ${response.statusCode}`,
		description: envelope.request_id ? `request_id ${String(envelope.request_id)}` : undefined,
	});
}

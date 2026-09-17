import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * One Glasser Key covers every data source. The test call is GET /v1/balance:
 * the cheapest authenticated endpoint the API has, and it charges nothing.
 */
export class GlasserApi implements ICredentialType {
	name = 'glasserApi';

	displayName = 'Glasser API';

	icon: Icon = { light: 'file:glasser.svg', dark: 'file:glasser.dark.svg' };

	documentationUrl = 'https://github.com/glasser-ai/n8n-nodes-glasser?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'gl_...',
			description: 'Create a Key at app.glasser.ai → Keys. Runs are prepaid and charged per call.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.glasser.ai',
			url: '/v1/balance',
			method: 'GET',
		},
	};
}

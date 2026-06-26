import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
  INodeProperties,
} from 'n8n-workflow';

export class ProDexAuthApi implements ICredentialType {
  name = 'prodexAuthApi';

  displayName = 'ProDex Auth API';

  documentationUrl = 'https://prodex.proday.in';

  icon: Icon = {
    light: 'file:../nodes/ProDex/prodex.svg',
    dark: 'file:../nodes/ProDex/prodex.dark.svg',
  };

  properties: INodeProperties[] = [
    {
      displayName:
        'Optional backup only. ProDex reads auth from disk after ProDex Setup login — you do not need these credentials unless you enable "Use n8n Credentials" on the ProDex node.\n\nTo use this credential type: ProDex Setup → Export Credential Values, then paste the fields below.',
      name: 'bootstrapNotice',
      type: 'notice',
      default: '',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
    },
    {
      displayName: 'Refresh Token',
      name: 'refreshToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
    },
    {
      displayName: 'ID Token',
      name: 'idToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
      description: 'Required for Codex agent identity. Include the idToken from the bootstrap helper output.',
    },
    {
      displayName: 'Account ID',
      name: 'accountId',
      type: 'string',
      required: true,
      default: '',
      description:
        'From Setup node export (accountId). Required for Codex API requests — without it credential test fails with "Bad request".',
    },
    {
      displayName: 'Expires At',
      name: 'expiresAt',
      type: 'string',
      required: true,
      default: '',
      description: 'ISO timestamp returned by the bootstrap helper',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.accessToken}}',
        'ChatGPT-Account-Id': '={{$credentials.accountId}}',
        'User-Agent': 'n8n-nodes-prodex',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://chatgpt.com/backend-api/codex',
      url: '/models',
      method: 'GET',
      headers: {
        'ChatGPT-Account-Id': '={{$credentials.accountId}}',
        'User-Agent': 'n8n-nodes-prodex',
        Accept: 'application/json',
      },
    },
    rules: [
      {
        type: 'responseCode',
        properties: {
          value: 200,
          message:
            'Could not validate ProDex credentials. Ensure accessToken, idToken, and accountId are copied exactly from the Setup node export.',
        },
      },
    ],
  };
}

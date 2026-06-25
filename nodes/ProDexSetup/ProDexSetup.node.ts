import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { exportCredentialValuesWithWait, startDeviceLogin, waitForAgentIdentity } from '../../lib/auth/codexLogin';
import { hasAgentIdentity, hasCompleteCodexAuth, readAuthJson, resolveCodexHome } from '../../lib/auth/codexEnv';
import { CodexAuthSetupError } from '../../lib/errors';

export class ProDexSetup implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ProDex Setup',
    name: 'prodexSetup',
    icon: { light: 'file:../ProDex/prodex.svg', dark: 'file:../ProDex/prodex.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'One-time ChatGPT subscription login for ProDex. Run Start Device Login, complete browser auth, then Wait for Login Complete before using the ProDex node.',
    defaults: {
      name: 'ProDex Setup',
    },
    documentationUrl: 'https://www.npmjs.com/package/n8n-nodes-prodex',
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Agents'],
      },
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      {
        displayName:
          'Setup guide (first time)\n\n1. Create a workflow with Manual Trigger → ProDex Setup.\n2. Operation: Start Device Login → Execute.\n3. Open verificationUrl in your browser and enter userCode. Sign in with ChatGPT.\n4. Change operation to Wait for Login Complete → Execute again.\n5. Confirm the output shows hasCompleteAuth: true.\n6. Add the ProDex node — leave Use n8n Credentials off. No credential picker needed.\n\nSkills: use ProDex → Install Skill, then List Installed Skills or Invoke Skill.\n\nOptional: Export Credential Values only if you want tokens in n8n Credentials and enable Use n8n Credentials on ProDex.',
        name: 'setupGuide',
        type: 'notice',
        default: '',
      },
      {
        displayName:
          'Known issues & watchouts\n\n• Self-hosted n8n only — not supported on n8n Cloud.\n• Use package version 0.1.12 or newer.\n• hasAgentIdentity: false is normal for ChatGPT device login. Ignore it.\n• hasCompleteAuth: true is what matters (valid OAuth tokens in auth.json).\n• Do not set CODEX_ACCESS_TOKEN to your OAuth access token. That env var is for enterprise Codex access tokens only and will break exec with "agent identity JWT payload is not valid JSON".\n• After browser login, run Wait for Login Complete — do not skip straight to ProDex on first setup.\n• Auth is stored on disk at codexHome (often /home/node/.n8n/codex or /home/node/.n8n-codex in Docker). Check login.log there if login fails.\n• If tokens expire later, repeat Start Device Login → Wait for Login Complete.\n• Pin this package version in production; Codex endpoints can change.',
        name: 'knownIssues',
        type: 'notice',
        default: '',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Export Credential Values',
            value: 'exportCredential',
            description: 'Optional backup — read tokens from auth.json after login (credentials not required to run ProDex)',
            action: 'Export credential values',
          },
          {
            name: 'Start Device Login',
            value: 'startDeviceLogin',
            description: 'Step 1 — start ChatGPT device login and return the verification URL and code',
            action: 'Start device login',
          },
          {
            name: 'Wait for Login Complete',
            value: 'waitForLogin',
            description: 'Step 2 — wait until OAuth tokens are saved and login process exits successfully',
            action: 'Wait for login complete',
          },
        ],
        default: 'startDeviceLogin',
      },
      {
        displayName: 'Wait Time (Seconds)',
        name: 'waitSeconds',
        type: 'number',
        default: 180,
        description:
          'How long to wait for auth.json tokens after browser login. Increase if your container is slow.',
        displayOptions: {
          show: {
            operation: ['exportCredential', 'waitForLogin'],
          },
        },
      },
      {
        displayName:
          'After Start Device Login: complete browser auth, then run Wait for Login Complete until hasCompleteAuth is true.',
        name: 'waitReminder',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: ['waitForLogin', 'exportCredential'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      if (operation === 'startDeviceLogin') {
        const login = await startDeviceLogin();
        return [
          [
            {
              json: {
                verificationUrl: login.verificationUrl,
                userCode: login.userCode,
                codexHome: login.codexHome,
                instructions: login.instructions,
              },
            },
          ],
        ];
      }

      if (operation === 'waitForLogin') {
        const waitSeconds = this.getNodeParameter('waitSeconds', 0, 180) as number;
        const authJson = await waitForAgentIdentity(Math.max(waitSeconds, 1) * 1000);
        return [
          [
            {
              json: {
                codexHome: resolveCodexHome(),
                hasAgentIdentity: hasAgentIdentity(authJson),
                hasCompleteAuth: hasCompleteCodexAuth(authJson),
                accountId: authJson.tokens.account_id,
                instructions:
                  'Login is complete. Add or run the ProDex node — credentials are optional. Note: hasAgentIdentity may be false; that is normal for ChatGPT device login.',
              },
            },
          ],
        ];
      }

      if (operation === 'exportCredential') {
        const waitSeconds = this.getNodeParameter('waitSeconds', 0, 180) as number;
        const credential = await exportCredentialValuesWithWait(waitSeconds * 1000);
        const authJson = readAuthJson(resolveCodexHome());
        const complete = hasCompleteCodexAuth(authJson);
        return [
          [
            {
              json: {
                ...credential,
                codexHome: resolveCodexHome(),
                hasAgentIdentity: hasAgentIdentity(authJson),
                hasCompleteAuth: complete,
                instructions: complete
                  ? 'Login is complete. Run the ProDex node — credentials are optional. hasAgentIdentity may be false; that is normal.'
                  : 'Login is not complete yet. Finish browser auth, then run Wait for Login Complete.',
              },
            },
          ],
        ];
      }

      throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
    } catch (error) {
      if (error instanceof CodexAuthSetupError) {
        throw new NodeOperationError(this.getNode(), error.message);
      }
      throw error;
    }
  }
}

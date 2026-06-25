import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { resolveCodexHome } from '../../lib/auth/codexEnv';
import { resolveRunnableAuth } from '../../lib/auth/resolveAuth';
import { runCodexAgent } from '../../lib/codex/runAgent';
import { CodexAuthRefreshError, CodexAuthSetupError, SkillCliInstallError } from '../../lib/errors';
import { buildAgentPrompt, resolveSkillNames } from '../../lib/skills/buildAgentPrompt';
import { installSkillViaCli } from '../../lib/skills/installSkillCli';
import { getInstalledSkillLoadOptions } from '../../lib/skills/skillLoadOptions';
import { listInstalledSkills, resolveSkillsHome } from '../../lib/skills/skillStore';
import type { CodexCredentialValues, Personality, ReasoningEffort, SandboxMode, ThreadMode } from '../../lib/types/codex';

const DEFAULT_MODELS = [
  { name: 'GPT-5.5', value: 'gpt-5.5' },
  { name: 'GPT-5.4', value: 'gpt-5.4' },
  { name: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
];

const AGENT_OPERATIONS = ['runAgent', 'invokeSkill'];

export class ProDex implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ProDex',
    name: 'prodex',
    icon: { light: 'file:prodex.svg', dark: 'file:prodex.svg' },
    group: ['transform'],
    version: 2,
    usableAsTool: true,
    subtitle: '={{$parameter["operation"] === "runAgent" || $parameter["operation"] === "invokeSkill" ? $parameter["model"] : $parameter["operation"]}}',
    description:
      'Run OpenAI Codex, install skills, and manage your ProDex workspace. Complete ProDex Setup once before agent runs.',
    defaults: {
      name: 'ProDex',
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
    credentials: [
      {
        name: 'prodexAuthApi',
        displayName: 'ProDex Auth API',
        required: true,
        displayOptions: {
          show: {
            useN8nCredentials: [true],
            operation: AGENT_OPERATIONS,
          },
        },
      },
    ],
    properties: [
      {
        displayName:
          'Before first agent run\n\nComplete setup once with the ProDex Setup node:\n1. Start Device Login\n2. Sign in in the browser\n3. Wait for Login Complete (hasCompleteAuth: true)\n\nNo credential selection is needed — auth is read from auth.json on disk. Leave "Use n8n Credentials" off unless you explicitly store tokens in n8n Credentials.\n\nFor AI Agent workflows, use the ProDex Chat Model node connected to Chat Model instead of Run Agent here.',
        name: 'prerequisiteNotice',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName:
          'Known issues & watchouts\n\n• Requires self-hosted n8n and @openai/codex CLI binaries (installed with this package).\n• Use package version 0.1.12 or newer.\n• Never set CODEX_ACCESS_TOKEN to an OAuth access token — it breaks Codex exec.\n• Prefer Read Only sandbox on shared servers unless you trust full filesystem access.\n• Continue Previous Thread stores threadId in node static data between runs.\n• If auth errors appear, re-run ProDex Setup (Start Device Login → Wait for Login Complete).\n• Codex uses your ChatGPT subscription, not pay-per-token API billing.',
        name: 'knownIssues',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Developer contact: collegeitpro@gmail.com — questions, bugs, and feature requests welcome.',
        name: 'developerContact',
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
            name: 'Run Agent',
            value: 'runAgent',
            description: 'Run Codex with an optional prompt and installed skills',
            action: 'Run agent',
          },
          {
            name: 'Install Skill',
            value: 'installSkill',
            description: 'Install a skill from GitHub using npx or pnpm dlx skills add',
            action: 'Install skill',
          },
          {
            name: 'List Installed Skills',
            value: 'listSkills',
            description: 'List skills stored under codexHome/skills',
            action: 'List installed skills',
          },
          {
            name: 'Invoke Skill',
            value: 'invokeSkill',
            description: 'Run Codex with one or more installed skills applied',
            action: 'Invoke skill',
          },
          {
            name: 'MCP Tools',
            value: 'mcpTools',
            description: 'Manage MCP tools (coming soon)',
            action: 'MCP tools',
          },
          {
            name: 'Plugins',
            value: 'plugins',
            description: 'Manage Codex plugins (coming soon)',
            action: 'Plugins',
          },
        ],
        default: 'runAgent',
      },
      {
        displayName: 'Use n8n Credentials',
        name: 'useN8nCredentials',
        type: 'boolean',
        default: false,
        description:
          'Off by default. When off, ProDex uses auth.json from ProDex Setup login on disk — no credential picker needed.',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName:
          'Installs a skill into codexHome/skills using the skills CLI.\n\nExample:\nnpx skills add https://github.com/anthropics/skills --skill docx -a codex -g -y',
        name: 'installSkillNotice',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: ['installSkill'],
          },
        },
      },
      {
        displayName: 'Package Manager',
        name: 'packageManager',
        type: 'options',
        options: [
          { name: 'NPX', value: 'npx' },
          { name: 'PNPM', value: 'pnpm' },
        ],
        default: 'npx',
        description: 'How to run the skills CLI',
        displayOptions: {
          show: {
            operation: ['installSkill'],
          },
        },
      },
      {
        displayName: 'Repository URL',
        name: 'repoUrl',
        type: 'string',
        default: 'https://github.com/anthropics/skills',
        placeholder: 'https://github.com/anthropics/skills',
        required: true,
        description: 'GitHub repository that contains SKILL.md files',
        displayOptions: {
          show: {
            operation: ['installSkill'],
          },
        },
      },
      {
        displayName: 'Skill Name',
        name: 'installSkillName',
        type: 'string',
        default: '',
        placeholder: 'docx',
        required: true,
        description: 'Skill folder name passed to --skill',
        displayOptions: {
          show: {
            operation: ['installSkill'],
          },
        },
      },
      {
        displayName:
          'MCP tool management is not available in this release. Use Codex CLI directly or watch for a future ProDex update.',
        name: 'mcpToolsNotice',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: ['mcpTools'],
          },
        },
      },
      {
        displayName:
          'Plugin management is not available in this release. Use Codex CLI directly or watch for a future ProDex update.',
        name: 'pluginsNotice',
        type: 'notice',
        default: '',
        displayOptions: {
          show: {
            operation: ['plugins'],
          },
        },
      },
      {
        displayName: 'System Prompt',
        name: 'systemPrompt',
        type: 'string',
        typeOptions: {
          rows: 5,
        },
        default: '',
        description: 'Static instructions prepended to every run (always applied)',
        displayOptions: {
          show: {
            operation: ['runAgent'],
          },
        },
      },
      {
        displayName: 'Skills',
        name: 'skills',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getInstalledSkills',
        },
        default: [],
        description: 'Optional installed skills to apply for this run',
        displayOptions: {
          show: {
            operation: ['runAgent'],
          },
        },
      },
      {
        displayName: 'Skills',
        name: 'invokeSkills',
        type: 'multiOptions',
        typeOptions: {
          loadOptionsMethod: 'getInstalledSkills',
        },
        default: [],
        required: true,
        description: 'Installed skills to invoke for this run',
        displayOptions: {
          show: {
            operation: ['invokeSkill'],
          },
        },
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: {
          rows: 6,
        },
        default: '={{ $json.chatInput || $json.prompt || $json.text }}',
        required: true,
        description: 'Instruction for the Codex agent',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: DEFAULT_MODELS,
        default: 'gpt-5.4',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Reasoning Effort',
        name: 'reasoningEffort',
        type: 'options',
        options: [
          { name: 'Extra High', value: 'xhigh' },
          { name: 'High', value: 'high' },
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
        ],
        default: 'medium',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Personality',
        name: 'personality',
        type: 'options',
        options: [
          { name: 'Default', value: 'default' },
          { name: 'Friendly', value: 'friendly' },
          { name: 'Pragmatic', value: 'pragmatic' },
        ],
        default: 'default',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Thread Mode',
        name: 'threadMode',
        type: 'options',
        options: [
          { name: 'Continue Previous Thread', value: 'continue' },
          { name: 'New Thread', value: 'new' },
          { name: 'Resume Thread By ID', value: 'resume' },
        ],
        default: 'new',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Thread ID',
        name: 'threadId',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
            threadMode: ['resume'],
          },
        },
      },
      {
        displayName: 'Sandbox',
        name: 'sandbox',
        type: 'options',
        options: [
          { name: 'Full Access', value: 'full_access' },
          { name: 'Read Only', value: 'read_only' },
          { name: 'Workspace Write', value: 'workspace_write' },
        ],
        default: 'read_only',
        description: 'Filesystem access level for Codex tool use',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Working Directory',
        name: 'workingDirectory',
        type: 'string',
        default: '',
        placeholder: '/data/project',
        description: 'Optional directory Codex should treat as its workspace',
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            operation: AGENT_OPERATIONS,
          },
        },
        options: [
          {
            displayName: 'Dynamic Skills',
            name: 'dynamicSkills',
            type: 'string',
            typeOptions: {
              rows: 3,
            },
            default: '={{ $json.skillNames || $json.skills }}',
            description:
              'Expression for per-run skills: skill names (array/string), inline markdown, or [{ name, content }]',
          },
          {
            displayName: 'Structured Output JSON Schema',
            name: 'outputSchema',
            type: 'json',
            default: '',
            description: 'Optional JSON schema for structured agent output',
          },
          {
            displayName: 'Stream Progress To Execution Log',
            name: 'streamProgress',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Timeout (Seconds)',
            name: 'timeoutSeconds',
            type: 'number',
            default: 300,
            typeOptions: {
              minValue: 30,
            },
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getInstalledSkills(this: ILoadOptionsFunctions) {
        return getInstalledSkillLoadOptions();
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = this.getNodeParameter('operation', itemIndex, 'runAgent') as string;

        if (operation === 'listSkills') {
          const codexHome = resolveCodexHome();
          const skills = listInstalledSkills(codexHome);
          returnData.push({
            json: {
              codexHome,
              skillsHome: resolveSkillsHome(codexHome),
              skills,
              skillNames: skills.map((skill) => skill.name),
              count: skills.length,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        if (operation === 'installSkill') {
          const codexHome = resolveCodexHome();
          const packageManager = this.getNodeParameter('packageManager', itemIndex, 'npx') as 'npx' | 'pnpm';
          const repoUrl = this.getNodeParameter('repoUrl', itemIndex) as string;
          const skillName = this.getNodeParameter('installSkillName', itemIndex) as string;

          const result = await installSkillViaCli({
            codexHome,
            packageManager,
            repoUrl,
            skillName,
          });

          returnData.push({
            json: {
              operation: 'installSkill',
              codexHome,
              skillsHome: resolveSkillsHome(codexHome),
              command: result.command,
              skillName,
              skill: result.skill,
              skillFound: result.skillFound,
              installed: result.installed,
              stdout: result.stdout,
              stderr: result.stderr,
              instructions: result.skillFound
                ? `Skill "${skillName}" installed. Use Invoke Skill or Run Agent with Skills to apply it.`
                : `CLI finished but "${skillName}" was not found under codexHome/skills. Run List Installed Skills to verify.`,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        if (operation === 'mcpTools' || operation === 'plugins') {
          returnData.push({
            json: {
              operation,
              status: 'not_implemented',
              message:
                operation === 'mcpTools'
                  ? 'MCP tool management will be added in a future ProDex release.'
                  : 'Plugin management will be added in a future ProDex release.',
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        if (operation === 'runAgent' || operation === 'invokeSkill') {
          const useN8nCredentials = this.getNodeParameter('useN8nCredentials', itemIndex, false) as boolean;
          let credentials: CodexCredentialValues | null = null;
          if (useN8nCredentials) {
            try {
              credentials = (await this.getCredentials('prodexAuthApi')) as CodexCredentialValues;
            } catch {
              throw new NodeOperationError(
                this.getNode(),
                'Use n8n Credentials is enabled but no ProDex Auth API credential is selected. Select a credential or turn the toggle off to use disk auth from ProDex Setup.',
                { itemIndex },
              );
            }
          }

          const { activeBundle, codexHome } = await resolveRunnableAuth(fetch, credentials);

          const prompt = this.getNodeParameter('prompt', itemIndex) as string;
          const systemPrompt =
            operation === 'runAgent' ? (this.getNodeParameter('systemPrompt', itemIndex, '') as string) : '';
          const selectedSkills =
            operation === 'invokeSkill'
              ? (this.getNodeParameter('invokeSkills', itemIndex, []) as string[])
              : (this.getNodeParameter('skills', itemIndex, []) as string[]);

          if (operation === 'invokeSkill' && selectedSkills.length === 0) {
            throw new NodeOperationError(this.getNode(), 'Select at least one skill to invoke.', { itemIndex });
          }

          const options = this.getNodeParameter('options', itemIndex, {}) as {
            dynamicSkills?: unknown;
            outputSchema?: string | IDataObject;
            streamProgress?: boolean;
            timeoutSeconds?: number;
          };

          const builtPrompt = buildAgentPrompt({
            userPrompt: prompt,
            systemPrompt,
            staticSkillNames: resolveSkillNames(selectedSkills),
            dynamicSkills: options.dynamicSkills,
            codexHome,
          });

          const model = this.getNodeParameter('model', itemIndex) as string;
          const reasoningEffort = this.getNodeParameter('reasoningEffort', itemIndex) as ReasoningEffort;
          const personality = this.getNodeParameter('personality', itemIndex) as Personality;
          const threadMode = this.getNodeParameter('threadMode', itemIndex) as ThreadMode;
          const sandbox = this.getNodeParameter('sandbox', itemIndex) as SandboxMode;
          const workingDirectory = this.getNodeParameter('workingDirectory', itemIndex, '') as string;

          let threadId = this.getNodeParameter('threadId', itemIndex, '') as string;
          const staticData = this.getWorkflowStaticData('node');
          if (threadMode === 'continue' && staticData.threadId && typeof staticData.threadId === 'string') {
            threadId = staticData.threadId;
          }

          const outputSchema =
            typeof options.outputSchema === 'string'
              ? options.outputSchema
                ? JSON.parse(options.outputSchema)
                : undefined
              : options.outputSchema;

          const result = await runCodexAgent({
            prompt: builtPrompt.prompt,
            model,
            reasoningEffort,
            personality,
            threadMode,
            threadId: threadId || undefined,
            sandbox,
            workingDirectory: workingDirectory || undefined,
            outputSchema,
            timeoutMs: (options.timeoutSeconds ?? 300) * 1000,
            streamProgress: options.streamProgress ?? false,
            onProgress: (message) => {
              this.logger.info(`ProDex: ${message}`);
            },
            tokenBundle: activeBundle,
            codexHome,
            additionalDirectories: builtPrompt.additionalDirectories,
          });

          if (threadMode === 'continue' && result.threadId) {
            staticData.threadId = result.threadId;
          }

          returnData.push({
            json: {
              operation,
              output: result.output,
              threadId: result.threadId,
              items: result.items,
              usage: result.usage,
              model: result.model,
              finishReason: result.finishReason,
              appliedSkills: builtPrompt.appliedSkills,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, { itemIndex });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        if (error instanceof SkillCliInstallError) {
          throw new NodeOperationError(this.getNode(), error.message, {
            itemIndex,
            description: error.stderr || error.stdout || error.command,
          });
        }

        if (error instanceof CodexAuthRefreshError || error instanceof CodexAuthSetupError) {
          throw new NodeOperationError(
            this.getNode(),
            `${error.message} Re-run ProDex Setup: Start Device Login → complete browser auth → Wait for Login Complete.`,
            { itemIndex },
          );
        }

        if (error instanceof Error && /Codex CLI binaries/i.test(error.message)) {
          throw new NodeOperationError(
            this.getNode(),
            'Codex CLI is not available in this environment. Install @openai/codex in your n8n container or host.',
            { itemIndex },
          );
        }

        throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
      }
    }

    return [returnData];
  }
}

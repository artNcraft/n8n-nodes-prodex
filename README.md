# ProDex Node for Self-Hosted n8n

Community node package that runs **OpenAI Codex** inside self-hosted n8n workflows using your **ChatGPT/Codex subscription** (device-code auth), not pay-per-token API billing.

## Features

- **ProDex** root node (prompt in, agent result out)
- **ProDex Chat Model** for n8n **AI Agent** (connect to Chat Model input)
- **ProDex Setup** node for browser login and credential export inside n8n
- **Token refresh** at runtime when access tokens expire
- Automatic Codex data directory under n8n's own user folder (no manual env vars)
- Thread modes: new, continue, resume
- **Skills system** — install SKILL.md files and reference them in system prompts (static + dynamic)

## Developer

Questions, bugs, and feature requests: **collegeitpro@gmail.com**
- Sandbox controls and optional structured JSON output

## Important caveat

This package uses Codex through the official `@openai/codex-sdk`, which spawns the Codex CLI and authenticates with ChatGPT subscription tokens. Codex backend endpoints may change without notice. Pin package versions in production.

## Requirements

- Self-hosted n8n (not n8n Cloud)
- Node.js 18+
- `@openai/codex` CLI binaries (installed automatically as a dependency on supported platforms)

## Installation

### Option A: Install from npm (community node UI)

In self-hosted n8n:

1. Open **Settings → Community Nodes**
2. Click **Install**
3. Enter package name:

```
n8n-nodes-prodex
```

4. Accept the risk prompt and install
5. Restart n8n if prompted

### Option B: Custom extensions directory (development)

```bash
git clone <this-repo>
cd n8n-nodes-prodex
npm install
npm run build

export N8N_CUSTOM_EXTENSIONS="/absolute/path/to/n8n-nodes-prodex"
n8n start
```

The package directory must contain installed dependencies (`@openai/codex`, `@openai/codex-sdk`). Running `npm install` in the package folder satisfies that requirement.

For Docker, mount the built package and set `N8N_CUSTOM_EXTENSIONS`. See [`docker/Dockerfile.n8n-codex`](docker/Dockerfile.n8n-codex).

## Authentication (entirely inside n8n)

No CLI or manual environment variables are required for users.

### Step 1: Start device login

1. Create a workflow with **Manual Trigger** → **ProDex Setup**
2. Set operation to **Start Device Login**
3. Execute the workflow
4. Open the returned `verificationUrl` and enter `userCode` in your browser
5. Sign in with your ChatGPT account

### Step 2: Wait for login complete

1. Change the setup node operation to **Wait for Login Complete**
2. Execute again after browser login completes
3. Confirm the output shows `hasCompleteAuth: true`

### Step 3: Run Codex

Add the **ProDex** node and run your workflow. **Do not select credentials** — leave **Use n8n Credentials** off. Auth is read automatically from `auth.json` on disk.

If tokens expire and refresh fails, repeat the setup flow with **ProDex Setup**.

### Optional: store tokens in n8n Credentials

Only needed if you prefer n8n Credentials over disk auth (e.g. multi-worker setups):

1. ProDex Setup → **Export Credential Values**
2. Create **Credentials → ProDex Auth API** and paste the returned fields
3. On the ProDex node, enable **Use n8n Credentials** and select that credential

| Credential field | JSON field from setup node |
|---|---|
| Access Token | `accessToken` |
| Refresh Token | `refreshToken` |
| ID Token | `idToken` |
| Account ID | `accountId` |
| Expires At | `expiresAt` |

## Use with n8n AI Agent (Chat Model)

Connect **ProDex Chat Model** to the **Chat Model** input on the **AI Agent** node:

1. Complete setup (Start Device Login → Wait for Login Complete)
2. Add **When chat message received** (or any trigger) → **AI Agent**
3. Add **ProDex Chat Model** as a separate node on the canvas
4. Connect **ProDex Chat Model → Model** to **AI Agent → Chat Model**
5. Execute and chat

Example layout:

```
When chat message received → AI Agent
ProDex Chat Model ──────→ Chat Model (on AI Agent)
```

**Notes:**

- Credentials are optional when `auth.json` is already on the server
- Tool nodes connected to AI Agent have limited support — Codex returns text responses, not native LangChain tool-call payloads. For full coding-agent behavior (sandbox, shell, multi-file edits), use the standalone **ProDex** node
- Default sandbox is **Read Only** for safer chat use

## Skills (install + system prompt)

Skills are stored as `SKILL.md` files under `{codexHome}/skills/{skill-name}/` (Cursor/Codex-compatible format).

### Install a skill

1. **ProDex Setup** → **Install Skill**
2. Set **Skill Name** (e.g. `release-notes`)
3. Paste full **Skill Markdown** (YAML frontmatter + body)
4. Execute

### List installed skills

**ProDex Setup** → **List Installed Skills** — returns `skillNames` you can copy into the ProDex node.

### Use skills in ProDex

| Field | Purpose |
|---|---|
| **System Prompt** | Static instructions on every run |
| **Static Skills** | Comma/newline skill names always loaded (e.g. `release-notes, lint-fix`) |
| **Dynamic Skills** | Expression per item — default `={{ $json.skillNames \|\| $json.skills }}` |

Dynamic skills accept:

- Skill names: `"release-notes"` or `["a", "b"]`
- Inline markdown: full SKILL.md text for one-off runs
- Objects: `[{ "name": "temp", "content": "..." }]`

Output includes `appliedSkills` so you can verify what was loaded.

## Usage

1. Add **ProDex** to your workflow
2. Select your **ProDex Auth API** credential
3. Set prompt (default expression reads `chatInput`, `prompt`, or `text`)
4. Choose model, reasoning effort, sandbox, and thread mode
5. Execute

### Output fields

```json
{
  "output": "Agent final response",
  "threadId": "thread_...",
  "items": [],
  "usage": { "inputTokens": 0, "outputTokens": 0, "totalTokens": 0 },
  "model": "gpt-5.4",
  "finishReason": "stop"
}
```

### Thread modes

- **New Thread**: starts fresh each run
- **Continue Previous Thread**: reuses `threadId` stored in node static data
- **Resume Thread By ID**: resumes explicit thread ID (Codex sessions under the n8n-managed Codex home directory)

## Manual E2E test

1. Install the node on a self-hosted n8n instance
2. Run **ProDex Setup → Start Device Login**, complete browser auth, then **Export Credential Values**
3. Create the **ProDex Auth API** credential from the exported JSON
4. Build workflow: **Manual Trigger** → **ProDex** → **Set**
5. Prompt: `Reply with the single word OK.`
6. Model: `gpt-5.4`, Sandbox: `Read Only`, Thread Mode: `New Thread`
7. Execute and verify `output` contains `OK` and `threadId` is populated

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

## Docker example

Build a custom n8n image with Codex preinstalled:

```bash
docker build -f docker/Dockerfile.n8n-codex -t n8n-codex .
docker run -p 5678:5678 -e N8N_CUSTOM_EXTENSIONS=/custom-nodes n8n-codex
```

Codex runtime files are stored automatically under n8n's user folder (for example `/home/node/.n8n/codex` in the official Docker image).

## Security notes

- Treat credential tokens like passwords
- Prefer `read_only` sandbox on shared servers
- Do not set `OPENAI_API_KEY` in n8n if you want subscription billing; it can override ChatGPT auth in some Codex versions

## License

MIT

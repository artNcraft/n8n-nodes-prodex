export class CodexAuthSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodexAuthSetupError';
  }
}

export class CodexAuthRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodexAuthRefreshError';
  }
}

export class CodexRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'CodexRequestError';
    this.status = status;
  }
}

export class SkillCliInstallError extends Error {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;

  constructor(message: string, details: { command: string; stdout: string; stderr: string; exitCode: number }) {
    super(message);
    this.name = 'SkillCliInstallError';
    this.command = details.command;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    this.exitCode = details.exitCode;
  }
}

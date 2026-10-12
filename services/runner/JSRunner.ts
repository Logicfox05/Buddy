export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
  error?: string;
}

export class JSRunner {
  async execute(code: string, input?: string): Promise<ExecutionResult> {
    const start = performance.now();
    const stdoutLogs: string[] = [];
    const stderrLogs: string[] = [];

    const customConsole = {
      log: (...args: any[]) => stdoutLogs.push(args.map(String).join(' ')),
      error: (...args: any[]) => stderrLogs.push(args.map(String).join(' ')),
      warn: (...args: any[]) => stdoutLogs.push(args.map(String).join(' ')),
      info: (...args: any[]) => stdoutLogs.push(args.map(String).join(' ')),
    };

    try {
      // Evaluate within a scoped sandbox wrapper
      const fn = new Function('console', 'input', `
        "use strict";
        ${code}
      `);

      const result = fn(customConsole, input);
      if (result !== undefined && stdoutLogs.length === 0) {
        stdoutLogs.push(String(result));
      }

      const runtime = Math.round(performance.now() - start);
      return {
        stdout: stdoutLogs.join('\n').trim(),
        stderr: stderrLogs.join('\n').trim(),
        exitCode: 0,
        runtime,
      };
    } catch (err: any) {
      const runtime = Math.round(performance.now() - start);
      return {
        stdout: stdoutLogs.join('\n').trim(),
        stderr: err?.message || String(err),
        exitCode: 1,
        runtime,
        error: err?.message || String(err),
      };
    }
  }

  async runTests(
    code: string,
    testCases: { input: string; expected: string }[],
    fnName?: string
  ): Promise<{ testCase: any; passed: boolean; actual: string; runtime: number }[]> {
    const results = [];

    for (const tc of testCases) {
      const start = performance.now();
      let passed = false;
      let actual = '';

      try {
        const testScript = `
          ${code}
          ${
            fnName
              ? `return ${fnName}(${tc.input});`
              : `return eval(${tc.input});`
          }
        `;
        const fn = new Function(testScript);
        const res = fn();
        actual = String(res).trim();
        passed = actual === String(tc.expected).trim();
      } catch (err: any) {
        actual = `Error: ${err?.message || String(err)}`;
        passed = false;
      }

      results.push({
        testCase: tc,
        passed,
        actual,
        runtime: Math.round(performance.now() - start),
      });
    }

    return results;
  }
}

export const jsRunner = new JSRunner();

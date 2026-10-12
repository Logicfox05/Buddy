declare global {
  interface Window {
    loadPyodide?: any;
    pyodide?: any;
  }
}

export interface PythonExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
  error?: string;
}

export class PythonRunner {
  private pyodideInstance: any = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<any> | null = null;

  async init(): Promise<any> {
    if (this.pyodideInstance) return this.pyodideInstance;
    if (this.initPromise) return this.initPromise;

    if (typeof window === 'undefined') {
      throw new Error('Pyodide can only run in the browser');
    }

    this.isInitializing = true;
    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        if (!window.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
          script.async = true;
          document.body.appendChild(script);

          await new Promise((res, rej) => {
            script.onload = res;
            script.onerror = () => rej(new Error('Failed to load Pyodide runtime script'));
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
        });
        this.pyodideInstance = pyodide;
        this.isInitializing = false;
        resolve(pyodide);
      } catch (err) {
        this.isInitializing = false;
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  async execute(code: string): Promise<PythonExecutionResult> {
    const start = performance.now();
    try {
      const py = await this.init();
      py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      const result = py.runPython(code);
      const stdout = py.runPython('sys.stdout.getvalue()');
      const stderr = py.runPython('sys.stderr.getvalue()');

      return {
        stdout: stdout || (result !== undefined ? String(result) : ''),
        stderr: stderr || '',
        exitCode: 0,
        runtime: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err?.message || String(err),
        exitCode: 1,
        runtime: Math.round(performance.now() - start),
        error: err?.message || String(err),
      };
    }
  }

  async runTests(
    code: string,
    testCases: { input: string; expected: string }[],
    fnName?: string
  ): Promise<{ testCase: any; passed: boolean; actual: string; runtime: number }[]> {
    const py = await this.init();
    const results = [];

    // Load user definition
    py.runPython(code);

    for (const tc of testCases) {
      const start = performance.now();
      let passed = false;
      let actual = '';

      try {
        const invocation = fnName ? `${fnName}(${tc.input})` : tc.input;
        const res = py.runPython(invocation);
        actual = String(res).trim();
        const expected = String(tc.expected).trim();

        // Convert python booleans / types if needed
        passed = actual.toLowerCase() === expected.toLowerCase();
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

export const pythonRunner = new PythonRunner();

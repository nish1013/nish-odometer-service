import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

interface RunResult {
  code: number | null;
  output: string;
}

const SERVER = ["--import", "tsx", "src/server.ts"];

function runServer(
  env: NodeJS.ProcessEnv,
  stopWhen: RegExp,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, SERVER, {
      env: { PATH: process.env.PATH, PORT: "0", ...env },
    });
    let output = "";
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (stopWhen.test(output)) child.kill();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ code, output });
    });
  });
}

describe("server start", () => {
  it("S10 OCR_PROVIDER unset -> logs OCR provider: mock", async () => {
    const { output } = await runServer({}, /Server listening/);
    expect(output).toContain("OCR provider: mock");
  });

  it("S10 OCR_PROVIDER=foo -> exits non-zero, names OCR_PROVIDER", async () => {
    const { code, output } = await runServer({ OCR_PROVIDER: "foo" }, /$^/);
    expect(code).not.toBe(0);
    expect(output).toContain("OCR_PROVIDER");
  });

  it("S10 openai, no key -> exits non-zero, names OPENAI_API_KEY", async () => {
    const { code, output } = await runServer({ OCR_PROVIDER: "openai" }, /$^/);
    expect(code).not.toBe(0);
    expect(output).toContain("OPENAI_API_KEY");
  });
});

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const languages = require("./languages");

const app = express();
app.use(cors()); // for production, restrict to your Vercel frontend domain (see README)
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5000;

// ---- Tunables ----
const COMPILE_TIMEOUT_MS = 10_000;
const RUN_TIMEOUT_MS = 8_000;
const MAX_BUFFER = 1024 * 1024; // 1MB of output max

app.get("/", (req, res) => {
  res.json({ status: "Volo backend is running", supported: Object.keys(languages) });
});

app.get("/languages", (req, res) => {
  const list = Object.entries(languages).map(([id, cfg]) => ({
    id,
    label: cfg.label,
  }));
  res.json(list);
});

app.post("/run", async (req, res) => {
  const { language, code, input } = req.body || {};

  if (!language || !languages[language]) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }
  if (typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({ error: "No code provided" });
  }

  const langConfig = languages[language];

  // Create an isolated temp directory for this run (volo1 workspace)
  const jobId = uuidv4();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `volo1-${jobId}-`));
  const srcPath = path.join(dir, langConfig.fileName);
  const binPath = path.join(dir, "volo1_bin");

  try {
    fs.writeFileSync(srcPath, code, "utf8");
  } catch (err) {
    cleanup(dir);
    return res.status(500).json({ error: "Failed to write source file" });
  }

  const paths = { dir, src: srcPath, bin: binPath };

  try {
    // 1. Compile step (skip for interpreted languages)
    if (langConfig.compile) {
      const compileCmd = langConfig.compile(paths);
      const compileResult = await runCommand(compileCmd, {
        cwd: dir,
        timeout: COMPILE_TIMEOUT_MS,
        input: "",
      });

      if (compileResult.error) {
        cleanup(dir);
        return res.json({
          success: false,
          stage: "compile",
          stdout: "",
          stderr: compileResult.stderr || compileResult.error.message,
        });
      }
    }

    // 2. Run step
    const runCmd = langConfig.run(paths);
    const runResult = await runCommand(runCmd, {
      cwd: dir,
      timeout: RUN_TIMEOUT_MS,
      input: input || "",
    });

    cleanup(dir);

    return res.json({
      success: !runResult.error,
      stage: "run",
      stdout: runResult.stdout,
      stderr: runResult.error
        ? runResult.stderr || runResult.error.message
        : runResult.stderr,
      timedOut: runResult.timedOut || false,
    });
  } catch (err) {
    cleanup(dir);
    return res.status(500).json({ error: "Internal execution error", detail: err.message });
  }
});

/**
 * Runs a shell command with stdin input, a timeout, and captured output.
 */
function runCommand(cmd, { cwd, timeout, input }) {
  return new Promise((resolve) => {
    const child = exec(
      cmd,
      { cwd, timeout, maxBuffer: MAX_BUFFER, killSignal: "SIGKILL" },
      (error, stdout, stderr) => {
        resolve({
          error,
          stdout: stdout || "",
          stderr: stderr || "",
          timedOut: error && error.killed === true,
        });
      }
    );

    if (input && child.stdin) {
      child.stdin.write(input);
    }
    if (child.stdin) child.stdin.end();
  });
}

function cleanup(dir) {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

app.listen(PORT, () => {
  console.log(`Volo backend listening on port ${PORT}`);
});

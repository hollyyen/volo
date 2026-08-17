const LANGUAGES = {
  cpp: {
    label: "C++",
    ext: ".cpp",
    mode: "text/x-c++src",
    boilerplate:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Start small. Ship something." << endl;\n    return 0;\n}\n',
  },
  c: {
    label: "C",
    ext: ".c",
    mode: "text/x-csrc",
    boilerplate:
      '#include <stdio.h>\n\nint main() {\n    printf("Start small. Ship something.\\n");\n    return 0;\n}\n',
  },
  python: {
    label: "Python 3",
    ext: ".py",
    mode: "python",
    boilerplate: 'print("Start small. Ship something.")\n',
  },
  javascript: {
    label: "JavaScript (Node.js)",
    ext: ".js",
    mode: "javascript",
    boilerplate: 'console.log("Start small. Ship something.");\n',
  },
  java: {
    label: "Java",
    ext: ".java",
    mode: "text/x-java",
    // NOTE: class name must stay "Volo1" — the backend compiles Volo1.java
    boilerplate:
      'public class Volo1 {\n    public static void main(String[] args) {\n        System.out.println("Start small. Ship something.");\n    }\n}\n',
  },
};

const languageSelect = document.getElementById("languageSelect");
const fileExtLabel = document.getElementById("fileExt");
const runBtn = document.getElementById("runBtn");
const outputEl = document.getElementById("output");
const statusText = document.getElementById("statusText");
const stdinBox = document.getElementById("stdinBox");

// Populate language dropdown
Object.entries(LANGUAGES).forEach(([id, cfg]) => {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = cfg.label;
  languageSelect.appendChild(opt);
});
languageSelect.value = "cpp";

// Set up CodeMirror editor
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
  lineNumbers: true,
  theme: "dracula",
  mode: LANGUAGES.cpp.mode,
  indentUnit: 4,
  tabSize: 4,
  matchBrackets: true,
});
editor.setValue(LANGUAGES.cpp.boilerplate);

function onLanguageChange() {
  const lang = languageSelect.value;
  const cfg = LANGUAGES[lang];
  fileExtLabel.textContent = cfg.ext;
  editor.setOption("mode", cfg.mode);
  editor.setValue(cfg.boilerplate);
}

languageSelect.addEventListener("change", onLanguageChange);
onLanguageChange();

async function runCode() {
  const language = languageSelect.value;
  const code = editor.getValue();
  const input = stdinBox.value;

  runBtn.disabled = true;
  statusText.textContent = "Running...";
  outputEl.textContent = "";

  try {
    const res = await fetch(`${VOLO_API_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code, input }),
    });

    const data = await res.json();

    if (data.error) {
      outputEl.textContent = `Error: ${data.error}`;
    } else {
      let text = "";
      if (data.stdout) text += data.stdout;
      if (data.stderr) text += (text ? "\n\n" : "") + "[stderr]\n" + data.stderr;
      if (!text) text = "(no output)";
      if (data.timedOut) text += "\n\n[Execution timed out]";
      outputEl.textContent = text;
    }

    statusText.textContent = data.success === false ? "Finished with errors" : "Finished";
  } catch (err) {
    outputEl.textContent = `Failed to reach Volo backend at ${VOLO_API_URL}.\n${err.message}`;
    statusText.textContent = "Connection error";
  } finally {
    runBtn.disabled = false;
  }
}

runBtn.addEventListener("click", runCode);

// Ctrl+Enter / Cmd+Enter to run
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});

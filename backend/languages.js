/**
 * Volo - language configuration
 * Each entry defines:
 *  - fileName: the source file name written to the temp sandbox dir
 *  - compile: (paths) => shell command to compile, or null if not needed
 *  - run: (paths) => shell command to execute
 */

const languages = {
  cpp: {
    label: "C++",
    fileName: "volo1.cpp",
    compile: ({ src, bin }) => `g++ "${src}" -O2 -o "${bin}"`,
    run: ({ bin }) => `"${bin}"`,
  },

  c: {
    label: "C",
    fileName: "volo1.c",
    compile: ({ src, bin }) => `gcc "${src}" -O2 -o "${bin}"`,
    run: ({ bin }) => `"${bin}"`,
  },

  python: {
    label: "Python 3",
    fileName: "volo1.py",
    compile: null,
    run: ({ src }) => `python3 "${src}"`,
  },

  javascript: {
    label: "JavaScript (Node.js)",
    fileName: "volo1.js",
    compile: null,
    run: ({ src }) => `node "${src}"`,
  },

  java: {
    // Java requires the public class name to match the file name.
    // We fix the public class name to "Volo1" and require the user's
    // code to declare: public class Volo1 { ... }
    label: "Java",
    fileName: "Volo1.java",
    compile: ({ dir }) => `javac "Volo1.java"`,
    run: ({ dir }) => `java -cp "${dir}" Volo1`,
    compileCwd: true,
    runCwd: true,
  },
};

module.exports = languages;

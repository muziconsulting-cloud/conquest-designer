import fs from "fs";

let serverCode = fs.readFileSync("src/server.ts", "utf8");

// Target the exact broken multiline pattern and swap to escaped newline string format
const targetBroken = 'output: output + (errOutput ? "\nERR:\n" + errOutput : ""),';
const cleanString = 'output: output + (errOutput ? "\\nERR:\\n" + errOutput : ""),';

if (serverCode.includes(targetBroken)) {
  serverCode = serverCode.replace(targetBroken, cleanString);
  fs.writeFileSync("src/server.ts", serverCode);
  console.log("✅ Successfully escaped newline string literal in src/server.ts!");
} else {
  // Let's do a robust fallback rewrite for that small block to ensure compilation passes
  const patchStart = `return Response.json({
              success: true,
              competencyId,
              output: output + (errOutput ? "`;
              
  const patchEnd = `ERR:
" + errOutput : ""),
              name: skill.name
            });`;

  const startIndex = serverCode.indexOf(patchStart);
  const endIndex = serverCode.indexOf(patchEnd);

  if (startIndex !== -1 && endIndex !== -1) {
    const codeBefore = serverCode.substring(0, startIndex);
    const codeAfter = serverCode.substring(endIndex + patchEnd.length);
    const robustPatch = `return Response.json({
              success: true,
              competencyId,
              output: output + (errOutput ? "\\nERR:\\n" + errOutput : ""),
              name: skill.name
            });`;
    fs.writeFileSync("src/server.ts", codeBefore + robustPatch + codeAfter);
    console.log("✅ Successfully repaired multiline block in src/server.ts!");
  } else {
    console.log("❌ Target block pattern not found. Let's inspect the lines.");
  }
}

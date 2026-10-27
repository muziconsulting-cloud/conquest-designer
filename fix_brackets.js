import fs from "fs";

let serverCode = fs.readFileSync("src/server.ts", "utf8");

// Define target block to smooth out the end of the route handler
const brokenSectionStart = "const result = await cduEngine.runAgentCompetency(agentId, competencyId, payload);";
const brokenSectionEnd = "return new Response('not found', { status: 404 })";

const startIndex = serverCode.indexOf(brokenSectionStart);
const endIndex = serverCode.indexOf(brokenSectionEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const codeBefore = serverCode.substring(0, startIndex);
  const codeAfter = serverCode.substring(endIndex);

  const cleanEnd = `const result = await cduEngine.runAgentCompetency(agentId, competencyId, payload);
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ success: false, error: err.message }, { status: 500 });
        }
      }
    
    // Fall-through handler
    `;

  fs.writeFileSync("src/server.ts", codeBefore + cleanEnd + codeAfter);
  console.log("✅ Brackets safely realigned inside src/server.ts!");
} else {
  console.log("❌ Target bracket boundary not found.");
}

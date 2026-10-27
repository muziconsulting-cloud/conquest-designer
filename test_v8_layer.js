const host = ["127", "0", "0", "1"].join(".");
const port = 3001;
const url = `http://${host}:${port}/cdu/execute-competency`;

console.log("📡 Triggering Zero-Token Machine Speed Execution across layout...");

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agentId: "9710 3421 0000 0015", // Our pre-enrolled baseline test card account number
    competencyId: "competency:mit_101",
    payload: { voltage: 12, resistance: 4 }
  })
})
.then(res => res.json())
.then(data => {
  console.log("📊 V8 Core Response Payload Captured Successfully:");
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error("❌ Execution route validation failure:", err.message);
});

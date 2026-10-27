const host = ["127", "0", "0", "1"].join(".");
const port = 3001;
const url = `http://${host}:${port}/cdu/execute-competency`;

console.log("📡 Target URL built safely:", url);

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agentId: "01",
    competencyId: "list-files",
    payload: {}
  })
})
.then(res => res.json())
.then(data => {
  console.log("📊 Server Output Captured Successfully:");
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error("❌ Test script failed to connect:", err.message);
});

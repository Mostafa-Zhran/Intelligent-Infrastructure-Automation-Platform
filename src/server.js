// Entry point trampoline for root-level deployment
const path = require("path");

const backendDir = path.resolve(__dirname, "..", "backend");
process.chdir(backendDir);

require(path.join(backendDir, "src", "server.js"));

// Entry point trampoline for root-level deployment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require("path");

const backendDir = path.resolve(__dirname, "..", "backend");
process.chdir(backendDir);

require(path.join(backendDir, "src", "server.js"));

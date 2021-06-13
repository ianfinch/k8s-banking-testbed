import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const log = {
    format: (level, msg) => (new Date().toISOString()) + " " + level + " [" + process.env["HOSTNAME"] + "] " + msg,
    info: (msg) => console.log(log.format("INFO ", msg)),
    error: (msg) => console.error(log.format("ERROR", msg))
};

process.on("SIGINT", () => {
    log.info("Server received interrupt signal");
    process.exit();
});

const port = 3000;
const apiPort = 8080;
const server = `http://localhost:${port}`;
const app = express();

// Serve static files from the "public" folder
app.use(express.static("public"));

// Change the port to the API port
const proxyRouter = (req) => {
    return "http://" + req.headers.host.replace(":" + port, ":" + apiPort);
};

// Proxy requests to a backend to avoid CORS restrictions
//
// Useful during development, so I can run the frontend from the command line
// and call services in the kubernetes cluster (and not need to rebuild and
// redeploy on every change)
if (process.argv.includes("WITH_BACKEND_PROXY")) {
    log.info("Backend proxy enabled");
    app.use("/customers", createProxyMiddleware({ router: proxyRouter }));
}

// Start the server
app.listen(port, () => {
    log.info("Server listening at " + server);
});

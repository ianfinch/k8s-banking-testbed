import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";

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
var template = null;

// Serve static files from the "public" folder
app.use(express.static("public"));

// Load in the template, if it's not already loaded
const getTemplate = () => {

    if (!template) {
        template = fs.readFileSync("public/template.html", "utf8");
    }

    return template;
};

// Fill in a template from a component file
const fillTemplate = (template, valueFile) => {

    const values = fs.readFileSync(valueFile, "utf8");
    const fields = template.match(/{{.*?}}/g);

    fields.forEach(field => {
        const tag = field.replace(/^{{ */, "").replace(/ *}}/, "");
        const regex = new RegExp("<" + tag + ">\(.*\)</" + tag + ">", "s");
        const value = regex.exec(values);

        if (value === null) {
            template = template.replace(field, "");
        } else {
            template = template.replace(field, value[1]);
        }
    });

    return template;
};

// Build up the home page from our template
app.get("/", (req, res) => {
    res.send(fillTemplate(getTemplate(), "components/index.html"));
});

// If we are using a proxy, need to change reqests from our port to the
// cluster's API port
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

import express from "express";
import morgan from "morgan";
import jest from "jest";

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
const server = `http://localhost:${port}`;
const logFormat = ":date[iso] :status   [" + process.env["HOSTNAME"] + "] :method :url HTTP/:http-version :res[content-length]";
const app = express();
app.use(morgan(logFormat));

app.get("/tests", (req, res) => {
    jest.run([]).then(() => {
        res.sendFile(process.env["PWD"] + "/test-report.html");
    });
});

app.get("/tests/layout.css", (req, res) => {
    res.set("content-type", "text/css");
    res.sendFile(process.env["PWD"] + "/layout.css");
});

app.get("/tests/test-report.css", (req, res) => {
    res.set("content-type", "text/css");
    res.sendFile(process.env["PWD"] + "/test-report.css");
});

app.listen(port, () => {
    log.info("Server listening at " + server);
});

import express from "express";
import morgan from "morgan";
import k8s from "@kubernetes/client-node";

const log = {
    format: (level, msg) => (new Date().toISOString()) + " " + level + " [" + process.env["HOSTNAME"] + "] " + msg,
    info: (msg) => console.log(log.format("INFO ", msg)),
    warn: (msg) => console.warn(log.format("WARN ", msg)),
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

// Our k8s API
var k8sApi = null;

/**
 * Set up the library to access the k8s API
 */
const initialiseK8s = () => {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
};

/**
 * Loop to wait until k8s API is available
 */
const k8sInitialisationLoop = () => {

    try {
        initialiseK8s();
    } catch (err) {
        log.warn("Unable to connect to k8s API: " + err.message + " (retrying)");
        setTimeout(() => {
            k8sInitialisationLoop();
        }, 10000);
    }
};
k8sInitialisationLoop();

/**
 * Convert an array of objects to an object of arrays, using a field within
 * each object as a key
 */
const arrayToObject = (arr, keyName) => {
    return arr.reduce((result, elem) => {

        const key = elem[keyName];
        if (!result[key]) {
            result[key] = [];
        }
        delete elem[keyName];
        result[key].push(elem);

        return result;
    }, {});
};

/**
 * Analyse the status of the pod and return a simple answer
 */
const analysePodStatus = (status) => {

    const analysis = status.reduce((result, item) => {
        result[item.type] = item.status;
        return result;
    }, {});

    if (analysis.Ready) {
        return "ready";
    }

    if (analysis.Initialized) {
        return "pending";
    }

    return "unknown";
};

/**
 * Grab the info we want from a pod description
 */
const analysePod = (pod) => {
    return {
        name: pod.metadata.name,
        app: pod.metadata.labels.app,
        ready: {
            status: analysePodStatus(pod.status.conditions),
            containers: pod.status.containerStatuses.map(container => ({
                name: container.name,
                status: container.ready ? "ready" : "pending",
                restarts: container.restartCount
            }))
        }
    };
};

/**
 * Get a list of pods in our namespace
 */
const getPods = () => {
    return k8sApi.listNamespacedPod("default")
        .then(data => {
            return arrayToObject(data.body.items.map(analysePod), "app");
        })
};

/**
 * Grab the info we want from a pod description
 */
const analyseService = (srv) => {
    return {
        name: srv.metadata.name,
        app: srv.spec.selector && srv.spec.selector.app
    };
};

/**
 * Get a list of services in our namespace
 */
const getServices = () => {
    return k8sApi.listNamespacedService("default")
        .then(data => {
            return data.body.items
                .map(analyseService)
                .filter(srv => srv.app)
                .reduce((result, service) => {
                    result[service.name] = service.app;
                    return result;
                }, {});
        })
};

/**
 * Get all the monitoring data and aggregate it
 */
const getMonitoringData = () => {

    return Promise.all([
        getServices(),
        getPods()
    ]).then(([services, pods]) => {
        return {
            services,
            pods
        };
    }).catch(err => {
        log.error("Request failed: " + err.code);
    });
};

/**
 * Get the logs from a container
 */
const getLogs = (pod, container) => {
    return k8sApi.readNamespacedPodLog(pod, "default", container)
            .then(data => data.response.body.split("\n"))
            .catch(err => { return null; });
};

app.get("/monitoring", (req, res) => {
    res.sendFile(process.env["PWD"] + "/monitoring.html");
});

app.get("/monitoring/data", (req, res) => {
    if (!k8sApi) {
        res.status(503).send({ error: "Waiting for kubernetes to become available" });
        return;
    }
    getMonitoringData().then(x => { res.send(x); });
});

app.get("/monitoring/logs/:pod/:container", (req, res) => {
    if (!k8sApi) {
        res.status(503).send({ error: "Waiting for kubernetes to become available" });
        return;
    }
    getLogs(req.params.pod, req.params.container).then(x => { res.send(x); });
});

app.get("/monitoring/layout.css", (req, res) => {
    res.set("content-type", "text/css");
    res.sendFile(process.env["PWD"] + "/layout.css");
});

app.get("/monitoring/monitoring.js", (req, res) => {
    res.set("content-type", "application/javascript");
    res.sendFile(process.env["PWD"] + "/monitoring.js");
});

app.listen(port, () => {
    log.info("Server listening at " + server);
});

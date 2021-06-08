import express from "express";
import { taffy as TAFFY } from "taffydb";
import axios from "axios";

/**
 * Enrich log messages with timestamp and host
 */
const log = {
    format: (level, msg) => (new Date().toISOString()) + " " + level + " [" + process.env["HOSTNAME"] + "] " + msg,
    info: (msg) => console.log(log.format("INFO ", msg)),
    error: (msg) => console.error(log.format("ERROR", msg))
};

/**
 * Allow Control-C interrupt
 */
process.on("SIGINT", () => {
    log.info("Server received interrupt signal");
    process.exit();
});

/**
 * Set up server
 */
const port = 3000;
const server = `http://localhost:${port}`;
const app = express();

// Placeholder for database
const db = {
    data: null,
    lastUpdated: null,
    errorMessage: null
};

/**
 * Remove internal fields (starting '___') from an object
 */
const removeInternalFields = obj => Object.keys(obj).reduce((result, field) => {
    if (field.substr(0, 3) !== "___") {
        result[field] = obj[field];
    }
    return result;
}, {});

/**
 * Initialise the server from the test data service
 */
const initialiseData = () => {

    if (!db.data) {
        axios.get("http://testdata-service/testdata/customers")
            .then(response => {
                db.data = TAFFY(response.data);
                db.errorMessage = null;
                log.info("TESTDATA LOAD: Successfully loaded");
            })
            .catch(error => {
                log.error("TESTDATA LOAD: " + error.toString());
                db.errorMessage = "Customer service not available";
            });
        db.lastUpdated = Date.now();
    }
};

/**
 * Execute a database query and return a result
 */
const dbQuery = () => {

    if (db.errorMessage) {
        return {
            status: 500,
            data: db.errorMessage
        };
    };

    return {
        status: 200,
        data: db.data().map(removeInternalFields)
    };
};

/**
 * Handle the top-level request to our server, which returns the list of customers
 */
app.get("/customers", (req, res) => {
    const queryResult = dbQuery();
    res.status(queryResult.status).send(queryResult.data);
});

/**
 * Poll the test data service until we get some data
 */
const pollTestData = () => {

    initialiseData();
    if (!db.data) {
        setTimeout(() => {
            pollTestData();
        }, 3000);
    }
};
pollTestData();

/**
 * Start our server
 */
app.listen(port, () => {
    log.info("Server listening at " + server);
});

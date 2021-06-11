import express from "express";
import morgan from "morgan";
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
app.use(morgan("combined"));

// Placeholder for database
const db = {
    data: null,
    lastUpdated: null,
    errorMessage: null
};

/**
 * Remove internal fields (starting with underscores) from an object
 */
const removeInternalFields = obj => Object.keys(obj).reduce((result, field) => {
    if (field.substr(0, 1) !== "_") {
        result[field] = obj[field];
    }
    return result;
}, {});

/**
 * Initialise the server from the test data service
 */
const initialiseData = (collection) => {

    axios.get("http://testdata-service/testdata/" + collection)
        .then(response => {
            db.data = TAFFY(response.data);
            db.errorMessage = null;
            log.info("TESTDATA LOAD: Successfully loaded");
        })
        .catch(error => {
            log.error("TESTDATA LOAD: " + error.toString());
            db.errorMessage = collection + " service not available";
        });
    db.lastUpdated = Date.now();
};

/**
 * Execute a database query and return a result
 */
const dbQuery = (query) => {

    if (db.errorMessage) {
        return {
            status: 500,
            data: db.errorMessage
        };
    };

    if (query) {
        return {
            status: 200,
            data: db.data(query).map(removeInternalFields)
        };
    }

    return {
        status: 200,
        data: db.data().map(removeInternalFields)
    };
};

/**
 * Poll the test data service until we get some data
 */
const pollTestData = (collection) => {

    initialiseData(collection);
    if (!db.data) {
        setTimeout(() => {
            pollTestData(collection);
        }, 3000);
    }
};

/**
 * Create and start our server
 */
const restServer = (collection) => {

    // Populate the data
    pollTestData(collection);

    // Handle the top-level request to our server
    app.get("/" + collection, (req, res) => {
        const queryResult = dbQuery();
        res.status(queryResult.status).send(queryResult.data);
    });

    // Handle a request for a specific item from a collection
    app.get("/" + collection + "/:id", (req, res) => {

        const pk = collection.replace(/s$/, "Id");
        const queryResult = dbQuery({[pk]: req.params.id});

        if (queryResult.data.length === 0) {
            res.sendStatus(404);
        } else {
            res.status(queryResult.status).send(queryResult.data[0]);
        }
    });

    // Handle a request for related resources
    app.get("/" + collection + "/:id/:related", (req, res) => {

        const pk = collection.replace(/s$/, "Id");
        const queryResult = db.data({[pk]: req.params.id}).map(x => x);

        if (queryResult.length === 0) {
            res.sendStatus(404);
            return;
        }

        const fk = "_" + req.params.related.replace(/s$/, "Ids");
        const subQueryResult = queryResult[0][fk];
        if (!subQueryResult) {
            res.sendStatus(404);
            return;
        }

        res.status(200).send(subQueryResult);
    });

    // Start the server
    app.listen(port, () => {
        log.info("Server listening at " + server);
    });
};

export { restServer };

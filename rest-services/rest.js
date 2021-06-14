import express from "express";
import morgan from "morgan";
import { taffy as TAFFY } from "taffydb";
import axios from "axios";

/**
 * Set up server
 */
const port = 3000;
const server = `http://localhost:${port}`;
const logFormat = ":date[iso] :status   [" + process.env["HOSTNAME"] + "] :method :url HTTP/:http-version :res[content-length]";

/**
 * Placeholder for database
 */
const db = { data: null, lastUpdated: null, errorMessage: null };

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
const populateTestData = (collection) => {

    initialiseData(collection);
    if (!db.data) {
        setTimeout(() => {
            populateTestData(collection);
        }, 3000);
    }
};

/**
 * Handle a request for all items in the collection
 */
const getAllItems = (collection, req, res) => {
    const queryResult = dbQuery();
    res.status(queryResult.status).send(queryResult.data);
};

/**
 * Handle a request for one or more specific items from a collection
 *
 * The format of the URL should be /<collection>/<item id>.  If the item id
 * contains one or more commas, the server will treat the request as a list of
 * resources to retrieve and return each one (or try to).
 *
 * If only one item id is passed, the object representing that item will be
 * returned.  If a list of items is passed, then an array of objects will be
 * returned.  Note that a request for a single item can be forced to return a
 * list, if a comma is included in the request (i.e. /<collection>/,<item id>
 * or /<collection>/<item id>,).
 */
const getSpecifiedItems = (collection, req, res) => {
    const pk = collection.replace(/s$/, "Id");
    const queryResult = dbQuery({[pk]: req.params.id.split(",")});

    if (queryResult.data.length === 0) {
        res.sendStatus(404);
    } else {
        if (req.params.id.includes(",")) {
            res.status(queryResult.status).send(queryResult.data);
        } else {
            res.status(queryResult.status).send(queryResult.data[0]);
        }
    }
};

/**
 * Return a list of items related to a specific item (or items) in a collection
 *
 * URL format should be /<collection>/<item id>/<name of related collection>.
 *
 * Note that the item id can be a comma-separated list, in which case a list of
 * items related to all the items from the comma-separated list will be
 * returned.
 */
const getRelatedItems = (collection, req, res) => {
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
};

/**
 * Create and start our server
 *
 * 1) Make API call to testdata service to populate the data
 * 2) Create app server and initiate logging
 * 3) Add routes
 * 4) Start server
 *
 */
const restServer = (collection) => {

    populateTestData(collection);

    const app = express();
    app.use(morgan(logFormat));

    app.get("/" + collection, (req, res) => {
        getAllItems(collection, req, res);
    });

    app.get("/" + collection + "/:id", (req, res) => {
        getSpecifiedItems(collection, req, res);
    });

    app.get("/" + collection + "/:id/:related", (req, res) => {
        getRelatedItems(collection, req, res);
    });

    app.listen(port, () => {
        log.info("Server listening at " + server);
    });
};

export { restServer };

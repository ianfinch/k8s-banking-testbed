/**
 * Cache data, so as not to make too many API calls
 */
const cacheData = {};

/**
 * Easy way to store stuff in the cache
 */
const writeToCache = (table, id, data) => {

    if (!cacheData[table]) {
        cacheData[table] = {};
    }

    cacheData[table][id] = data;
};

/**
 * Easy way to get stuff back from the cache
 *
 * If we don't have the data cached, then we need to go and get it from the API
 * (and then cache the result)
 */
const readFromCache = (table, id) => {
    let result = cacheData[table] && cacheData[table][id];

    if (result) {
        return result;
    }

    return fetch("/" + table + "/" + id)
            .then(x => x.json())
            .then(x => {
                writeToCache(table, id, x);
                return x;
            });
};

/**
 * Set the text within the h2 heading
 */
const setH2Text = (text) => {
    document.getElementById("sectionHeading").innerText = text;
};

/**
 * A view button to be added to a table
 */
const viewButton = (cell, formatterParams, onRendered) => {
    return "<button>View</button>";
};

/**
 * Shortcut to display a hidden element
 */
const displayElement = (id) => {
    const elem = document.getElementById(id);
    if (elem.tagName === "BUTTON") {
        elem.style.display = "inline";
    } else {
        elem.style.display = "block";
    }
};

/**
 * Shortcut to hide an element
 */
const hideElement = (id) => {
    document.getElementById(id).style.display = "none";
};

/**
 * Display a table
 */
const displayTable = (id) => {
    displayElement(id + "-heading");
    displayElement(id + "-table");
};

/**
 * Hide a table
 */
const hideTable = (id) => {
    hideElement(id + "-heading");
    hideElement(id + "-table");
};

/**
 * Action to view a customer
 */
const viewCustomer = (e, cell) => {
    const data = cell.getRow().getData();
    writeToCache("customers", data.customerId, data);
    location.hash = "#customers/" + data.customerId;
};

/**
 * Display a customer's details
 */
const displayCustomer = async (id) => {
    const data = await readFromCache("customers", id);
    setH2Text(["Customer:", data.title, data.firstName, data.lastName].join(" "));
    hideTable("customer");
    hideTable("transactions");
    displayTable("accounts");
    displayTable("contact");
    displayElement("close-details");
    tables.contacts.clearData();
    tables.contacts.setData("/customers/" + data.customerId + "/contacts");
    tables.accounts.clearData();
    tables.accounts.setData("/customers/" + data.customerId + "/accounts");
};

/**
 * Action to view an account
 */
const viewAccount = (e, cell) => {
    const data = cell.getRow().getData();
    writeToCache("accounts", data.accountId, data);
    location.hash = "#accounts/" + data.accountId;
};

/**
 * Display an account's details
 */
const displayAccount = async (id) => {
    const data = await readFromCache("accounts", id);
    setH2Text(["Account:", data.accountNumber, "(" + data.sortCode + ")"].join(" "));
    hideTable("accounts");
    hideTable("contact");
    displayElement("close-details");
    displayTable("customer");
    displayTable("transactions");
    tables.customers.clearData();
    tables.customers.setData("/accounts/" + data.accountId + "/customers");
    tables.transactions.clearData();
    tables.transactions.setData("/accounts/" + data.accountId + "/transactions");
};

/**
 * Action to view contact details
 */
const viewContact = (e, cell) => {
    const data = cell.getRow().getData();
    writeToCache("contacts", data.contactId, data);
    location.hash = "#contacts/" + data.contactId;
};

/**
 * Display a contact's details
 */
const displayContact = async (id) => {
    const data = await readFromCache("contacts", id);
    setH2Text("Contact:" + data.email);
    hideTable("accounts");
    hideTable("contact");
    hideTable("transactions");
    displayElement("close-details");
    displayTable("customer");
    tables.customers.clearData();
    tables.customers.setData("/contacts/" + data.contactId + "/customers");
};

/**
 * Create an array containing columns for a table, plus the view button
 */
const createTableColumns = (definition) => {

    let result = Object.keys(definition.columns).map(column => {
        return {
            title: column,
            field: definition.columns[column]
        };
    });

    if (definition.viewAction) {
        result.push({
            title: "Actions",
            formatter: viewButton,
            width: 120,
            hozAlign: "center",
            cellClick: definition.viewAction
        });
    }

    return result;
};

/**
 * Create a table
 *
 * Definition:
 *
 * - div = the id for the div the table will be inserted into
 * - url = the url to pull the table data from
 * - columns = object containing column label (key) and field name (value)
 * - viewAction = the function to be called when the view button is clicked
 */
const createTable = (definition)  => {
    return new Tabulator("#" + definition.div, {
        pagination: "local",
        paginationSize: 10,
        ajaxURL: definition.url,
        layout: "fitColumns",
 	    columns: createTableColumns(definition),
        placeholder: "No data available"
    });
};

/**
 * Initialise everything
 */
const initialise = () => {
    initialiseButtons();
    return initialiseTables();
};

/**
 * Initialise the tables
 */
const initialiseTables = () => {

    const tables = {
        customers: createTable({
            div: "customer-table",
            url: null,
            columns: {
	            "Title": "title",
	            "First Name": "firstName",
	            "Last Name": "lastName"
            },
            viewAction: viewCustomer
        }),

        accounts: createTable({
            div: "accounts-table",
            url: null,
            columns: {
                "Branch": "branch",
                "Sort Code": "sortCode",
                "Account Number": "accountNumber",
                "Balance": "balance"
            },
            viewAction: viewAccount
        }),

        contacts: createTable({
            div: "contact-table",
            url: null,
            columns: {
	            "Street": "street",
	            "City": "city",
	            "County": "county",
	            "Postcode": "postCode",
	            "Phone": "phone",
	            "Email": "email"
            },
            viewAction: viewContact
        }),

        transactions: createTable({
            div: "transactions-table",
            url: null,
            columns: {
	            "Date": "date",
	            "Transaction": "description"
            }
        })
    };

    return tables;
}

/**
 * Set up button listeners
 */
const initialiseButtons = () => {

    document.getElementById("close-details").addEventListener("click", () => {
        const heading = document.getElementById("sectionHeading").innerText.split(":")[0];
        if (heading === "Account") {
            location.hash = "#accounts";
        } else {
            location.hash = "#customers";
        }
    });
};

/**
 * A variable to reference all our tables
 */
const tables = initialise();

/**
 * Display a list of customers
 */
const displayCustomers = () => {
    tables.customers.clearData();
    tables.customers.setData("/customers");
    setH2Text("Customers");
    hideElement("customer-heading");
    displayElement("customer-table");
    hideTable("accounts");
    hideTable("contact");
    hideTable("transactions");
    hideElement("close-details");
};

/**
 * Display a list of accounts
 */
const displayAccounts = () => {
    tables.accounts.clearData();
    tables.accounts.setData("/accounts");
    setH2Text("Accounts");
    hideElement("accounts-heading");
    displayElement("accounts-table");
    hideTable("customer");
    hideTable("contact");
    hideTable("transactions");
    hideElement("close-details");
};

/**
 * Take action based on the URL
 */
const analyseUrl = () => {

    if (window.location.hash === "#customers") {
        displayCustomers();

    } else if (window.location.hash.match(/^#customers\/[-0-9a-f]*$/)) {
        const id = window.location.hash.split("/")[1];
        displayCustomer(id);

    } else if (window.location.hash === "#accounts") {
        displayAccounts();

    } else if (window.location.hash.match(/^#accounts\/[-0-9a-f]*$/)) {
        const id = window.location.hash.split("/")[1];
        displayAccount(id);

    } else if (window.location.hash.match(/^#contacts\/[-0-9a-f]*$/)) {
        const id = window.location.hash.split("/")[1];
        displayContact(id);

    } else {
        displayCustomers();
    }
};


/**
 * Hang actions off of URL changes
 */
window.addEventListener("popstate", () => {
    analyseUrl();
});

/**
 * Start things off by looking at the URL
 */
analyseUrl();

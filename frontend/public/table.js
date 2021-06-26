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
 * Action to view a customer
 */
const viewCustomer = (e, cell) => {
    const data = cell.getRow().getData();
    setH2Text(["Customer:", data.title, data.firstName, data.lastName].join(" "));
    hideElement("customer-table");
    displayElement("customer-details");
    displayElement("close-customer-details");
    tables.contacts.setData("/customers/" + data.customerId + "/contacts");
    tables.accounts.setData("/customers/" + data.customerId + "/accounts");
};

/**
 * Action to close the customer details
 */
const closeCustomerDetails = () => {
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

    result.push({
        title: "Actions",
        formatter: viewButton,
        width: 120,
        hozAlign: "center",
        cellClick: definition.viewAction
    });

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
            url: "/customers",
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
//        viewAction: viewCustomer
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
//        viewAction: viewCustomer
        })
    };

    return tables;
}

/**
 * Set up button listeners
 */
const initialiseButtons = () => {

    document.getElementById("close-customer-details").addEventListener("click", () => {
        displayCustomers();
    });
};

/**
 * A variable to reference all our tables
 */
const tables = initialise();

/**
 * Display the customers pane
 */
const displayCustomers = () => {
    setH2Text("Customers");
    displayElement("customer-table");
    hideElement("customer-details");
    hideElement("close-customer-details");
//    tables.customers.redraw(true);
};

/**
 * Display the accounts pane
 */
const displayAccounts = () => {
    setH2Text("Accounts");
    hideElement("customer-table");
    hideElement("customer-details");
    hideElement("close-customer-details");
};

/**
 * Take action based on the URL
 */
const analyseUrl = () => {

    if (window.location.href.endsWith("#customers")) {
        displayCustomers();

    } else if (window.location.href.endsWith("#accounts")) {
        displayAccounts();

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

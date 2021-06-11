/**
 * Set the text within the h2 heading
 */
const setH2Text = (text) => {
    document.getElementsByTagName("h2")[0].innerText = text;
};

/**
 * A view button to be added to a table
 */
const viewButton = (cell, formatterParams, onRendered) => {
    return "<button>View</button>";
};

/**
 * Action to view a customer
 */
const viewCustomer = (e, cell) => {
    const data = cell.getRow().getData();
    setH2Text(["Customer:", data.title, data.firstName, data.lastName].join(" "));
    document.getElementById("customer-table").style.display = "none";
    document.getElementById("customer-details").style.display = "block";
    tables.contacts.setData("/customers/" + data.customerId + "/contacts");
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
        layout: "fitDataTable",
 	    columns: createTableColumns(definition)
    });
};

/**
 * Initialise the tables
 */
const initialise = () => {

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
	            "Title": "title",
	            "First Name": "firstName",
	            "Last Name": "lastName"
            },
//        viewAction: viewCustomer
        }),

        contacts: createTable({
            div: "contact-table",
            url: null,
            columns: {
	            "Title": "title",
	            "First Name": "firstName",
	            "Last Name": "lastName"
            },
//        viewAction: viewCustomer
        })
    };

    return tables;
}

/**
 * A variable to reference all our tables
 */
const tables = initialise();

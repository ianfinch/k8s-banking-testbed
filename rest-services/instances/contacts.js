import { restServer } from "./rest.js";

restServer("contacts", {
    customers: "http://customer-service"
});

import { restServer } from "./rest.js";

restServer("customers", {
    accounts: "http://accounts-service",
    contacts: "http://contacts-service"
});

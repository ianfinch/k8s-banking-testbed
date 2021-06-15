import { restServer } from "./rest.js";

restServer("customers", {
    contacts: "http://contacts-service"
});

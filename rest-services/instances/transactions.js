import { restServer } from "./rest.js";

restServer("transactions", {
    accounts: "http://accounts-service"
});

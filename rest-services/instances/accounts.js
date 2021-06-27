import { restServer } from "./rest.js";

restServer("accounts", {
    customers: "http://customer-service",
    transactions: "http://transactions-service"
});

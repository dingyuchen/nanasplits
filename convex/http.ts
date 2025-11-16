import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount the auth routes
auth.addHttpRoutes(http);

export default http;

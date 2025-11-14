import { httpRouter } from "convex/server";
import { auth } from "./authInit";

const http = httpRouter();

// Add Convex Auth HTTP routes for OAuth flow
auth.addHttpRoutes(http);

export default http;

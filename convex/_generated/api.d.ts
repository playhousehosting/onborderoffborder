/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminConsent from "../adminConsent.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as authInit from "../authInit.js";
import type * as authMutations from "../authMutations.js";
import type * as graph from "../graph.js";
import type * as http from "../http.js";
import type * as offboarding from "../offboarding.js";
import type * as onboarding from "../onboarding.js";
import type * as ssoAuth from "../ssoAuth.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminConsent: typeof adminConsent;
  auth: typeof auth;
  authActions: typeof authActions;
  authInit: typeof authInit;
  authMutations: typeof authMutations;
  graph: typeof graph;
  http: typeof http;
  offboarding: typeof offboarding;
  onboarding: typeof onboarding;
  ssoAuth: typeof ssoAuth;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

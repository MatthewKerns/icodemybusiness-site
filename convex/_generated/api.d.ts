/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as admin from "../admin.js";
import type * as auditLog from "../auditLog.js";
import type * as deliverables from "../deliverables.js";
import type * as email from "../email.js";
import type * as leads from "../leads.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dateFilter from "../lib/dateFilter.js";
import type * as lib_leadScoring from "../lib/leadScoring.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as milestones from "../milestones.js";
import type * as pageViews from "../pageViews.js";
import type * as projects from "../projects.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  auditLog: typeof auditLog;
  deliverables: typeof deliverables;
  email: typeof email;
  leads: typeof leads;
  "lib/auth": typeof lib_auth;
  "lib/dateFilter": typeof lib_dateFilter;
  "lib/leadScoring": typeof lib_leadScoring;
  "lib/rateLimits": typeof lib_rateLimits;
  milestones: typeof milestones;
  pageViews: typeof pageViews;
  projects: typeof projects;
  subscriptions: typeof subscriptions;
  users: typeof users;
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

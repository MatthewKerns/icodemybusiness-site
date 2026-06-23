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
import type * as agentSessions from "../agentSessions.js";
import type * as applications from "../applications.js";
import type * as auditLog from "../auditLog.js";
import type * as conversationMessages from "../conversationMessages.js";
import type * as conversations from "../conversations.js";
import type * as deliverables from "../deliverables.js";
import type * as email from "../email.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as intakeProcessor from "../intakeProcessor.js";
import type * as leads from "../leads.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_dateFilter from "../lib/dateFilter.js";
import type * as lib_leadScoring from "../lib/leadScoring.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_validators from "../lib/validators.js";
import type * as milestones from "../milestones.js";
import type * as pageViews from "../pageViews.js";
import type * as projects from "../projects.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as visitorEvents from "../visitorEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  agentSessions: typeof agentSessions;
  applications: typeof applications;
  auditLog: typeof auditLog;
  conversationMessages: typeof conversationMessages;
  conversations: typeof conversations;
  deliverables: typeof deliverables;
  email: typeof email;
  emails: typeof emails;
  http: typeof http;
  intakeProcessor: typeof intakeProcessor;
  leads: typeof leads;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/dateFilter": typeof lib_dateFilter;
  "lib/leadScoring": typeof lib_leadScoring;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/validators": typeof lib_validators;
  milestones: typeof milestones;
  pageViews: typeof pageViews;
  projects: typeof projects;
  subscriptions: typeof subscriptions;
  users: typeof users;
  visitorEvents: typeof visitorEvents;
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

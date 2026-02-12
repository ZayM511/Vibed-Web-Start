/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as analytics from "../analytics.js";
import type * as community from "../community.js";
import type * as communityReviews from "../communityReviews.js";
import type * as dataCollection from "../dataCollection.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as extensionApi from "../extensionApi.js";
import type * as extensionErrors from "../extensionErrors.js";
import type * as featureCache from "../featureCache.js";
import type * as featureExtraction from "../featureExtraction.js";
import type * as feedback from "../feedback.js";
import type * as ghostJobDetector from "../ghostJobDetector.js";
import type * as ghostJobMutations from "../ghostJobMutations.js";
import type * as http from "../http.js";
import type * as jobScans from "../jobScans.js";
import type * as jobsActions from "../jobsActions.js";
import type * as jobsMutationsAndQueries from "../jobsMutationsAndQueries.js";
import type * as mlPipeline from "../mlPipeline.js";
import type * as myFunctions from "../myFunctions.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as reviewHistory from "../reviewHistory.js";
import type * as scans_actions from "../scans/actions.js";
import type * as scans_mutations from "../scans/mutations.js";
import type * as scans_queries from "../scans/queries.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as todos from "../todos.js";
import type * as trainingData from "../trainingData.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as waitlistEmail from "../waitlistEmail.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  analytics: typeof analytics;
  community: typeof community;
  communityReviews: typeof communityReviews;
  dataCollection: typeof dataCollection;
  documents: typeof documents;
  email: typeof email;
  extensionApi: typeof extensionApi;
  extensionErrors: typeof extensionErrors;
  featureCache: typeof featureCache;
  featureExtraction: typeof featureExtraction;
  feedback: typeof feedback;
  ghostJobDetector: typeof ghostJobDetector;
  ghostJobMutations: typeof ghostJobMutations;
  http: typeof http;
  jobScans: typeof jobScans;
  jobsActions: typeof jobsActions;
  jobsMutationsAndQueries: typeof jobsMutationsAndQueries;
  mlPipeline: typeof mlPipeline;
  myFunctions: typeof myFunctions;
  rateLimiter: typeof rateLimiter;
  reviewHistory: typeof reviewHistory;
  "scans/actions": typeof scans_actions;
  "scans/mutations": typeof scans_mutations;
  "scans/queries": typeof scans_queries;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  todos: typeof todos;
  trainingData: typeof trainingData;
  users: typeof users;
  waitlist: typeof waitlist;
  waitlistEmail: typeof waitlistEmail;
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

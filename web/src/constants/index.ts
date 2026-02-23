/**
 * Constants - Barrel Export
 *
 * @module constants
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const IS_PROD = import.meta.env.PROD;

export * from "./statuses";
export * from "./candidate-constants";
export * from "./document-types";
export * from "./document-types";

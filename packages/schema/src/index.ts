/**
 * The data contract between pipeline and site.
 *
 * Both sides import from here and nowhere else. The real schema is frozen on
 * Day 3 (see BUILD_PLAN.md §3 and ARCHITECTURE.md §9); until then this file is
 * intentionally near-empty. Use the `schema-edit` skill to change it.
 */

export const SCHEMA_VERSION = 1 as const;

export {};

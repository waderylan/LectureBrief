import type { MetadataRoute } from "next";

/**
 * BUILD_PLAN.md Day 5: unlisted until the operator is satisfied with output
 * quality (ARCHITECTURE.md §10) — removing this is meant to be the entire
 * technical change at that point, so keep it a single, obvious edit here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}

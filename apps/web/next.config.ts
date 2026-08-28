import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS source with NodeNext-style `.js`-suffixed
  // relative imports (required for `tsx`'s ESM loader, which the pipeline CLI
  // runs under). Turbopack's default resolution doesn't remap those `.js`
  // specifiers to sibling `.ts` files for packages outside the app itself —
  // transpilePackages opts them into Next's own transform/resolve pipeline,
  // which does.
  transpilePackages: ["@lecturebrief/db", "@lecturebrief/schema"],
};

export default nextConfig;

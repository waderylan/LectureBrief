/**
 * ARCHITECTURE.md §6.1/§6.2, exact wording. Section chrome — always rendered
 * on the build and prompt sections, on /build, on /prompts, and (since it's
 * simply always-on chrome for those sections) on a deep link to a single
 * item too. Never conditional on a flag.
 */
export function SideProjectsLabel() {
  return (
    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
      Side projects for extended learning. Not for coursework or assignments.
    </p>
  );
}

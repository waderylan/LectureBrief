/**
 * ARCHITECTURE.md §6.1/§6.2, exact wording. Section chrome — always rendered
 * on the build and prompt sections, on /build, on /prompts, and (since it's
 * simply always-on chrome for those sections) on a deep link to a single
 * item too. Never conditional on a flag.
 */
export function SideProjectsLabel() {
  return (
    <p className="border-l-2 border-[#d9362b] bg-[#eee8de] px-3 py-2 text-xs font-medium text-[#5f5a52]">
      Side projects for extended learning. Not for coursework or assignments.
    </p>
  );
}

import "server-only";

/** Triggers a GitHub Actions workflow_dispatch. Rendering needs Chromium,
 * which can't run on Vercel, so heavy work (generate / regenerate / publish
 * now) is delegated to the repo's workflows. */
export async function dispatchWorkflow(
  workflow: "social-generate.yml" | "social-publish.yml",
  inputs: Record<string, string>
): Promise<void> {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO || "SaadOsama10/hattah-store";
  if (!token) throw new Error("GH_DISPATCH_TOKEN غير مضبوط في Vercel");
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: process.env.GH_REF || "main", inputs }),
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

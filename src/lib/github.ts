const BASE = `https://api.github.com/repos/${process.env.GH_OWNER}/${process.env.GH_REPO}/contents`;
const HEADERS = {
  Authorization: `token ${process.env.GH_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
};

function workflowContent(job: {
  id: string;
  name: string;
  schedule: string;
}): string {
  return `name: CronOS - ${job.name}
on:
  schedule:
    - cron: '${job.schedule}'
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Execute CronOS job
        run: |
          curl -s -X POST ${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${job.id}/run \\
            -H "Authorization: Bearer \${{ secrets.CRONOS_SECRET }}" \\
            -H "Content-Type: application/json" \\
            --fail-with-body
`;
}

async function getFileSHA(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

export async function createWorkflow(job: {
  id: string;
  name: string;
  schedule: string;
}) {
  const path = `.github/workflows/cronos-${job.id}.yml`;
  const content = Buffer.from(workflowContent(job)).toString("base64");
  await fetch(`${BASE}/${path}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ message: `Add CronOS job: ${job.name}`, content }),
  });
  return path;
}

export async function updateWorkflow(
  job: { id: string; name: string; schedule: string },
  currentPath: string,
) {
  const sha = await getFileSHA(currentPath);
  if (!sha) return currentPath;
  const content = Buffer.from(workflowContent(job)).toString("base64");
  await fetch(`${BASE}/${currentPath}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      message: `Update CronOS job: ${job.name}`,
      content,
      sha,
    }),
  });
  return currentPath;
}

export async function deleteWorkflow(path: string) {
  const sha = await getFileSHA(path);
  if (!sha) return;
  await fetch(`${BASE}/${path}`, {
    method: "DELETE",
    headers: HEADERS,
    body: JSON.stringify({ message: `Delete CronOS job`, sha }),
  });
}

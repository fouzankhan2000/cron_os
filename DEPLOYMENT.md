# CronOS Deployment Guide

## Step 1 -- Create the GitHub workflows repo

1. Go to github.com -> New repository
2. Name it: `cronos-workflows`
3. Set to **Private**
4. Initialize with a README (so the repo isn't empty)
5. Go to Settings -> Secrets and variables -> Actions -> New repository secret
   - Name: `CRONOS_SECRET`
   - Value: run `openssl rand -hex 32` locally and paste the output

## Step 2 -- Create a GitHub Personal Access Token

1. GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token
2. Resource owner: your account
3. Repository access: Only selected -> choose `cronos-workflows`
4. Permissions:
   - Contents: Read and write
   - Actions: Read and write
5. Generate token -> copy it immediately (shown once)
6. This is your `GH_TOKEN` env var

## Step 3 -- Deploy to Vercel

```bash
npm install -g vercel
vercel
```

In the Vercel dashboard -> your project -> Settings -> Environment Variables, add all of these:

| Key                             | Value                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | from Supabase project settings                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase project settings                                     |
| `SUPABASE_SERVICE_KEY`          | from Supabase -> Settings -> API -> service_role key               |
| `OPENAI_API_KEY`                | from platform.openai.com                                           |
| `GH_TOKEN`                      | the PAT from step 2                                                |
| `GH_OWNER`                      | your GitHub username                                               |
| `GH_REPO`                       | cronos-workflows                                                   |
| `NEXT_PUBLIC_APP_URL`           | your Vercel deployment URL e.g. `https://cronos-fouzan.vercel.app` |
| `CRONOS_SECRET`                 | same value you added to GitHub secrets                             |

Redeploy after adding env vars:

```bash
vercel --prod
```

## Step 4 -- End-to-end test

1. Open your deployed dashboard
2. Create a test job:
   - Description: "Post a build in public tip on Twitter every Tuesday at 9am"
   - Answer the clarify questions
   - Set up Telegram (optional but recommended for testing)
   - Review and add
3. Check the `cronos-workflows` GitHub repo -- you should see `.github/workflows/cronos-<job-id>.yml`
4. Go to the repo -> Actions tab -> manually trigger the workflow using "Run workflow"
5. Watch the job detail page -- the run log should appear within 30 seconds via Supabase realtime
6. If Telegram is set up, you should get a message on your phone with posting buttons

## Step 5 -- Verify GitHub Actions scheduled trigger

1. Create a second test job with schedule `*/5 * * * *` (every 5 minutes)
2. Wait up to 5 minutes
3. Check the Actions tab in `cronos-workflows` -- you should see it fire automatically
4. After confirming, delete or disable the test job

## Maintenance notes

- **GitHub Actions free tier**: 2,000 minutes/month for private repos. Each job run takes ~15 seconds. 20 daily jobs = ~150 minutes/month -- well under the limit.
- **Supabase free tier**: 500MB database, 2GB file storage, 50,000 monthly active users. More than enough for a personal tool.
- **OpenAI GPT-4o mini**: costs roughly $0.15 per million input tokens. Daily AI/social jobs at ~1,000 tokens each = less than $1/month.

## Local development

```bash
npm run dev
```

To test the executor locally, use ngrok to expose localhost:

```bash
npx ngrok http 3000
```

Set `NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io` temporarily in `.env.local`.
Then manually trigger a workflow from the GitHub Actions tab.

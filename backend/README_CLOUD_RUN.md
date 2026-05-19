Google Cloud Run deployment instructions for the Briefr backend

Prerequisites

- Google Cloud SDK installed (`gcloud`) and authenticated
- Billing enabled on a Google Cloud Project
- Docker is installed (optional: `gcloud builds submit` can build for you)

1. Configure gcloud

```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

2. Build and push the container (recommended)

From `briefr/backend`:

```bash
# Build and push image to Container Registry
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/briefr-backend .

# Deploy to Cloud Run
gcloud run deploy briefr-backend \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/briefr-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY,FRONTEND_ORIGINS=https://YOUR_VERCEL_FRONTEND_URL"
```

Notes:

- Prefer setting sensitive values like `GEMINI_API_KEY` via the Cloud Run console under "Variables & Secrets" rather than passing them on the CLI.
- The `FRONTEND_ORIGINS` variable should be set to your Vercel domain (for CORS), e.g. `https://briefr-xyz.vercel.app`.

3. Get the service URL

After deploy, Cloud Run will print a service URL like `https://briefr-backend-xxxxx-uc.a.run.app`.
Copy this URL for the frontend.

4. Update Vercel frontend environment

In your Vercel project settings, set the environment variable:

- `NEXT_PUBLIC_API_BASE` = `https://<your-cloud-run-url>`

Then redeploy the frontend.

5. Confirm CORS

The backend reads `FRONTEND_ORIGINS` at startup and adds CORS accordingly. Make sure it contains your Vercel domain.

6. Useful extras

- To update env vars in Cloud Run without redeploying via CLI, use:

```bash
gcloud run services update briefr-backend --update-env-vars "FRONTEND_ORIGINS=https://briefr-xyz.vercel.app"
```

- To view logs:

```bash
gcloud logs read --project=$GOOGLE_CLOUD_PROJECT --limit=50
```

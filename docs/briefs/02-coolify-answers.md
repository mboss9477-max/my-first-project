# Coolify Research Brief: Staging & Deployment Findings

**Date:** 2026-10-25  
**Author:** Gemini CLI  
**Branch:** `gemini/overnight-briefs`  
**Purpose:** Technical answers and configuration analysis for deploying the CS NEWS Next.js frontend, Payload CMS backend, and PostgreSQL 17 database on Coolify, researched from Coolify's official documentation (`coolify.io/docs`) and repository.

> **Context Note:** Claude did NOT verify any of this; the installed Coolify version on the VPS is unknown (the owner can check the version in the panel footer/settings). No SSH, servers, dashboards, or accounts were accessed.

---

## 1. How is the Node.js version pinned for a Nixpacks app (the CMS needs Node 24; the site builds on 22)?

### Answer:
Coolify uses Nixpacks to auto-detect and build Node.js applications. Node.js versions can be pinned at major or exact patch levels using three standard methods:

1. **`package.json` engines field (Recommended & Standard)**:
   Nixpacks automatically parses the `engines` field in `package.json`:
   ```json
   {
     "engines": {
       "node": "24"
     }
   }
   ```
   For the website, `news-site/web/package.json` already specifies `"engines": { "node": ">=20" }` (building on Node 22). For the CMS, `news-site/cms/package.json` can specify `"engines": { "node": "24" }`.
2. **Version Pinning Files (`.nvmrc` or `.node-version`)**:
   Placing a `.nvmrc` or `.node-version` file containing `24` in the application root or base directory instructs Nixpacks to fetch that major version.
3. **Coolify Build Environment Variable**:
   Set `NIXPACKS_NODE_VERSION=24` under the application's **Environment Variables** in the Coolify dashboard, marking it as a **Build time** variable.
4. **Exact Patch Pinning via `nixpkgsArchive` (Advanced)**:
   Because Nixpacks maps major versions to the current snapshot of `NixOS/nixpkgs`, an exact minor/patch version can be locked by creating a `nixpacks.toml` file in the application root:
   ```toml
   [phases.setup]
   nixpkgsArchive = '<nixpkgs-commit-sha>'
   ```

- **Source URL:** `https://coolify.io/docs/knowledge-base/nodejs/nixpacks-versioning` (and `https://coolify.io/docs/knowledge-base/how-to/pin-nodejs-version-with-nixpacks`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 2. If a build fails, does Coolify keep the previous version serving?

### Answer:
**Yes.** Coolify employs **Rolling Updates** (zero-downtime deployments) by default for Nixpacks, Dockerfile, Railpack, and Docker Image applications:

1. **How Rolling Updates Work**:
   When a new deployment is triggered, Coolify builds the new container image and starts the new container *concurrently* while the existing container remains running and serving live traffic via Traefik.
2. **Failure Handling**:
   - **If the build fails**: The build pipeline aborts immediately; no container swap occurs, and the previous running container continues serving traffic without interruption.
   - **If the container fails health checks**: Coolify waits for the new container's health check to pass before reconfiguring Traefik. If health checks fail or time out, the deployment is marked failed, the replacement container is removed, and the existing healthy container continues serving traffic.
3. **Manual Rollback**:
   Coolify retains previous Docker container images locally under the application's **Rollback** tab, allowing a one-click rollback to an older image tag if an issue is discovered post-deployment.

- **Source URL:** `https://coolify.io/docs/knowledge-base/rolling-updates` (and `https://coolify.io/docs/knowledge-base/applications/rollback`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 3. How is a persistent volume mounted for a path inside the app (Payload stores uploads in a "media" folder next to the app)?

### Answer:
Container filesystems are ephemeral by default. Persistent storage is configured via Coolify's **Persistent Storage** interface:

1. **Configuration Steps in Dashboard**:
   - Open the application in Coolify.
   - Select **Persistent Storage** from the resource sidebar.
   - Click **Add** and select the mount type:
     - **Volume Mount (Recommended)**: Managed by Docker as a named volume (survives container redeployments, updates, and recreations without locking to host paths).
     - **Directory Mount (Bind Mount)**: Maps a specific directory on the host VPS filesystem directly into the container.
2. **Path Mapping**:
   - **Destination Path**: Set to the exact path inside the container where Payload CMS stores uploaded media (e.g. `/app/news-site/cms/media` or `/app/media`, depending on Nixpacks container working directory).
   - **Source Path / Volume Name**: Left to Docker for automatic volume management, or set to a named volume (e.g. `cms-media-volume`).
3. **Activation**:
   Click **Save** and redeploy/restart the application for the storage mount to attach.

- **Source URL:** `https://coolify.io/docs/knowledge-base/persistent-storage`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 4. Where are CPU and memory limits set for an application and for a database resource?

### Answer:
CPU and memory limits are managed under the **Resource Limits** tab for both application and standalone database resources:

1. **Location**:
   Navigate to the resource in the Coolify dashboard (Application or Database) -> select **Resource Limits** in the sidebar.
2. **CPU Controls**:
   - **CPU limit**: Hard limit in cores or fraction of cores (e.g. `2` or `0.5`; default is `0` for unlimited).
   - **CPU set**: Pins the container to specific CPU cores (e.g. `0-1` or `0,2`).
   - **CPU weight**: Relative CPU scheduling weight/shares when competing under contention (default `1024`).
3. **Memory Controls**:
   - **Memory limit**: Hard ceiling for container RAM (e.g. `1.5g` for the CMS, `750m` for Postgres; default `0`). Exceeding this triggers the Docker Out-Of-Memory (OOM) killer.
   - **Memory reservation**: Soft reservation threshold for host memory contention.
   - **Memory and swap limit**: Combined RAM + swap cap available to the container.
   - **Swappiness**: Container anonymous memory page swap tendency (integer `0`–`100`; default `60`).
4. **Activation**:
   Click **Save changes** and restart or redeploy the resource to recreate containers with the new resource constraints.

- **Source URL:** `https://coolify.io/docs/knowledge-base/resource-limits`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 5. Can a second application be created from the same GitHub repo with a different base directory and domain?

### Answer:
**Yes.** Monorepo and multi-application deployment from a single GitHub repository is a native core feature of Coolify:

1. **How to Configure**:
   - Create a second Application resource in Coolify pointing to the same GitHub repository and branch (`main`).
   - In **General Settings**, configure the **Base Directory**:
     - Live / Staging Website: `/news-site/web`
     - CMS Backend: `/news-site/cms`
   - In the **Domains** field, assign distinct subdomains:
     - E.g. `https://csnews.news` (live web), `https://site-staging.csnews.news` (staging web), and `https://cms-staging.csnews.news` (staging CMS).
2. **Independent Settings**:
   Each application maintains its own build pack, port mappings, environment variables, resource limits, and persistent storage.
3. **Watch Paths (Monorepo Optimization)**:
   Under **General > Build**, configure **Watch Paths** (e.g. `news-site/cms/**` for the CMS, `news-site/web/**` for the website). Coolify will then ignore commits that do not touch the designated path, avoiding unnecessary builds.

- **Source URL:** `https://coolify.io/docs/knowledge-base/applications/monorepo` (and `https://coolify.io/docs/knowledge-base/applications/git-sources`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 6. How are pre- or post-deployment commands run (we need "npm run migrate" before each CMS start)?

### Answer:
1. **Running Migrations Before Each Startup (Pre-Start Execution)**:
   - Coolify does not have a separate universal "pre-deployment hook" input field for Nixpacks.
   - The established and standard pattern in Coolify is to **override the Start Command** under the application's **General / Build** settings (or via `nixpacks.toml` `[start] cmd = "..."`) to chain the migration and start scripts:
     ```bash
     npm run migrate && npm run start
     ```
   - Chaining with `&&` guarantees that if `npm run migrate` encounters an error, the process terminates immediately with a non-zero exit code, aborting container startup and preventing the CMS from running on an out-of-date or unmigrated schema.
2. **Post-Deployment Commands**:
   - Coolify supports a **Post-deployment command** input in deployment settings.
   - *Caution regarding post-deployment commands for migrations*: Coolify marks a container deployment complete *before* executing the post-deployment command. Failures in post-deployment commands are logged but do not abort container promotion. Therefore, database migrations required for the application to boot must be chained in the **Start Command**, not run post-deployment.

- **Source URL:** `https://coolify.io/docs/knowledge-base/applications/build-settings` (and `https://coolify.io/docs/knowledge-base/applications/general-settings`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 7. How are health checks configured?

### Answer:
Health checks provide readiness signals to Traefik and Docker, ensuring that traffic is only routed to containers once they are fully initialized and healthy:

1. **Configuration Location**:
   Navigate to the Application in Coolify -> select **Healthcheck** in the sidebar.
2. **Check Types**:
   - **HTTP Check**:
     - Sends an HTTP request to an endpoint inside the container (e.g. `/api/health` or `/`).
     - *Requirement*: `curl` or `wget` must be installed inside the container image (Nixpacks includes `curl`/`wget` standard).
   - **CMD Check**:
     - Executes a command inside the container (e.g. a script or process check).
3. **Configurable Parameters**:
   - **Path / Command**: URL path (e.g. `/`) or command.
   - **Port**: Application listening port (e.g. `3000` or `3200`).
   - **Interval**: Frequency of check (default e.g. 10s–30s).
   - **Timeout**: Maximum wait time before marking an attempt failed.
   - **Retries**: Consecutive failures required before marking the container unhealthy.
   - **Start period**: Grace period allowing slow boot/migration processes before checks begin.
4. **Traefik Proxy Integration**:
   Traefik routes traffic exclusively to containers reporting healthy status. If a container becomes unhealthy, Traefik automatically removes it from the routing pool.

- **Source URL:** `https://coolify.io/docs/knowledge-base/health-checks`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 8. Can auto-deploy on push be switched off per application?

### Answer:
**Yes.** Auto-deploy can be toggled off individually per application:

1. **Configuration Location**:
   In the application dashboard, navigate to **Advanced > Deployment** (or **General Settings**, depending on Coolify version).
2. **Settings**:
   - Under **Auto deploy**, uncheck or toggle off **Deploy on push (webhooks)**.
   - When disabled, webhook notifications sent by GitHub upon branch pushes or merges will not trigger a build for that application.
3. **Manual & Controlled Deployments**:
   With auto-deploy disabled, deployments can be triggered:
   - Manually by clicking **Deploy** in the Coolify dashboard.
   - Programmatically via Coolify's authenticated deploy webhook:
     `POST https://<coolify-domain>/api/v1/deploy?uuid=<app-uuid>&force=false`
     using an API token with `deploy` permission.
4. **Use Case for CS NEWS**:
   This matches Staging Step S4 requirement: disabling auto-deploy on the CMS application ensures that merges to `main` for web-only or doc-only PRs do not unnecessarily rebuild or redeploy the CMS.

- **Source URL:** `https://coolify.io/docs/knowledge-base/applications/webhooks` (and `https://coolify.io/docs/knowledge-base/applications/git-sources`)
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 9. How do you mark an environment variable build-time versus runtime?

### Answer:
Coolify provides independent scoping controls for each environment variable:

1. **Configuration Location**:
   Navigate to the Application -> select **Environment Variables** in the sidebar.
2. **Scope Options**:
   Each variable has independent scoping controls (dropdowns or checkboxes):
   - **Build time** (*Available during build* vs. *Not available during build*)
   - **Runtime** (*Available in the container* vs. *Not available in the container*)
3. **Standard Scopes**:
   - **Build and runtime** (Default for new variables): Available both while compiling the Docker image and inside the running container.
   - **Build only**: Injected only during image build (via Docker build arguments or BuildKit secrets). Essential for Next.js static page generation where public config or build-time data sources are needed.
   - **Runtime only**: Withheld during image compilation; injected exclusively when the container process starts. Best practice for sensitive database passwords, encryption keys, and secrets (`PAYLOAD_SECRET`, `DATABASE_URL`) that should never leak into Docker image build layers.

- **Source URL:** `https://coolify.io/docs/knowledge-base/environment-variables`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## 10. Can a Postgres resource be reachable only on the internal network (no published port)?

### Answer:
**Yes.** In fact, this is Coolify's **default security configuration**:

1. **Default Private Networking**:
   When a PostgreSQL standalone database resource is provisioned in Coolify, it is attached to a private internal Docker bridge network destination. By default, it does **not** map or publish any port to the host or internet.
2. **Internal Connection URL**:
   Applications residing on the same Coolify destination network communicate internally using the **Internal URL**:
   ```
   postgres://<username>:<password>@<container-name>:5432/<database>
   ```
   Coolify provides this internal connection string automatically.
3. **Public Access is Off by Default**:
   Public port publishing is controlled by the **Public through TCP proxy** setting under the database configuration. Keeping this setting turned off ensures that port 5432 is completely closed to the outside world, satisfying Threat Model T17 and Staging Step S3.

- **Source URL:** `https://coolify.io/docs/knowledge-base/database/postgresql`
- **Date Read:** 2026-10-25
- **Confidence:** **confirmed**

---

## To Test on the Real Server

The following concrete verification checks should be executed in the Coolify dashboard and terminal during Staging Steps S1–S4:

1. **Identify Installed Coolify Version**: Check the version number in the panel footer or Settings to verify whether the UI matches the v4.x documentation layout.
2. **Verify Node 24 Nixpacks Pinning**: Deploy a test build of `news-site/cms` with `"engines": { "node": "24" }` and check the build log output to confirm Nixpacks downloads and executes Node.js v24.x rather than default 22.x.
3. **Verify Container Internal Media Path**: Inspect the running CMS container filesystem (`docker exec` or container file browser) to determine the exact working directory for Payload uploads (confirming whether the destination path is `/app/media` or `/app/news-site/cms/media`).
4. **Test Chained Migration Start Command**: Set the CMS start command to `npm run migrate && npm run start` and verify in the runtime container logs that database migrations apply cleanly and exit 0 before Payload launches.
5. **Verify Rolling Update Failure Resilience**: On the staging website, trigger a deliberate failing build (e.g. bad build command or syntax error) to verify that the previous running container stays online and Traefik continues serving 200 responses.
6. **Verify Internal Database Network Isolation**: Run an external port check against port 5432 to confirm the database port is closed from the outside, while confirming the CMS container resolves the internal container name and connects cleanly.
7. **Verify Auto-Deploy Toggle**: Push a test commit to `main` and verify that the CMS application with auto-deploy disabled does not trigger a build.

---

## Verification & Guard Rails

### Verified by me:
- Researched directly against Coolify's official documentation (`coolify.io/docs`) on 2026-10-25.
- Verified that all 10 technical items have concrete source URLs and specific dashboard configuration steps.
- Created strictly as a new file in `docs/briefs/02-coolify-answers.md` on branch `gemini/overnight-briefs`.
- Zero existing docs, source code, package.json, or lockfiles were modified.
- Zero server IP addresses, internal hostnames, or secrets were committed.

### Not verified:
- Live verification against the real VPS Coolify installation (requires owner S5 authorization and panel access; unverified by Claude or Gemini).
- Exact Coolify version running on the server (to be confirmed by the owner from the dashboard).
- Specific behavior of Nixpacks package resolution for Node 24 on the server's build environment.

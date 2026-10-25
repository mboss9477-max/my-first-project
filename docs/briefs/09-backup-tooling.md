# Backup Tooling and Offsite Storage Architecture (Task 1.11, Decision D4, Step S11)

Date: 2026-10-25  
Target Scope: Nightly encrypted backups of the CMS PostgreSQL database and the CMS persistent media folder (`media/`), offsite storage destinations (Backblaze B2, Cloudflare R2, Owner's Windows PC), and clean-machine restore procedure.  
Context: Cross-referenced with `docs/staging-plan.md` decision D4 and step S11; aligns with quality gate G1.

---

## 1. Tooling Comparison: Encrypted Database & Media Backups

We evaluated three architectural approaches for producing nightly encrypted backups of both the PostgreSQL 17 database and the CMS persistent media volume (`media/` containing uploaded images).

### Comparison Matrix
| Criterion | Option A: `pg_dump + age + rclone` | Option B: `restic` | Option C: Coolify Scheduled Backups |
| :--- | :--- | :--- | :--- |
| **Database Backup** | Native `pg_dump -Fc` (custom compressed format). | `pg_dump` piped to `restic backup --stdin`. | Native automated `pg_dump` via Coolify engine. |
| **Media Folder Backup** | `tar -czf` of `media/` volume piped to `age`. | Native directory backup (`restic backup /path/to/media`). | **NOT SUPPORTED**. Only backs up databases, not persistent app volumes. |
| **Client-Side Encryption** | **Asymmetric (Public Key)** via `age`. Server holds only public key; cannot decrypt past backups if compromised. | **Symmetric** (AES-256 / ChaCha20). Server must hold the repository passphrase. | **NONE**. Coolify sends plaintext SQL dumps to S3; relies only on S3 server-side encryption. |
| **Deduplication** | None (separate compressed tar/dump files per run). | **Block-level content-defined deduplication**. | None. Full dumps on every schedule. |
| **Retention Management** | Handled via simple cleanup script or `rclone delete --min-age`. | Built-in policy: `restic forget --keep-* --prune`. | Configured via Coolify UI retention count. |
| **Destination Flexibility** | Any S3, B2, R2, SFTP, WebDAV, local disk via `rclone`. | Direct S3, B2, SFTP, REST server, local path. | S3-compatible endpoints only. |
| **Restore Simplicity** | Very high: single static binary `age` + `pg_restore`. | Very high: single static binary `restic restore`. | Requires Coolify instance or manual `psql` restore. |
| **Operational Overhead** | Low (two-line shell script in cron or systemd timer). | Low (one CLI command in cron or systemd timer). | Lowest UI setup, but requires a separate tool for media. |

### Evaluation Summary
- **Option C (Coolify)** is **disqualified** as a standalone solution because it does not back up persistent volumes (`media/`) and does not provide client-side zero-knowledge encryption before transmission to cloud buckets.
- **Option B (`restic`)** is excellent for large datasets due to deduplication, but requires storing a symmetric decryption secret on the server so nightly cron can append snapshots.
- **Option A (`pg_dump + age + rclone`)** is the **most secure architecture**:
  - `age` supports **asymmetric encryption**: the server holds *only* the owner's public key (`age1...`).
  - If the server is ever compromised by an attacker, the attacker **cannot decrypt** any past backups stored on B2, R2, or local disks because the private key exists *only* on the owner's personal computer.
  - Since the dataset is tiny (~15 MB today, growing ~300 MB/month), block-level deduplication is unnecessary; standard gzip/zstd compression is more than sufficient.

---

## 2. Offsite Storage Destinations & Pricing Verification

Official pricing, allowances, and requirements verified on 2026-10-25:

| Metric / Requirement | Backblaze B2 (Free Tier) | Cloudflare R2 (Free Tier) | Owner's Windows PC |
| :--- | :--- | :--- | :--- |
| **Free Storage Allowance** | **10 GB** permanently free | **10 GB-month** free Standard storage | Local drive capacity (50+ GB free) |
| **Payment Method Required?** | **NO CREDIT CARD REQUIRED** | **CREDIT CARD / PAYPAL REQUIRED** | **NONE** ($0 cost, no sign-ups) |
| **Free Egress (Download) Rules** | Free downloads up to **3x average monthly storage** (e.g. 10 GB stored = 30 GB free download/month); $0.01/GB overage. Free egress to Cloudflare via Bandwidth Alliance. | **Zero egress fees** ($0/GB download permanently). | Zero network/egress cost (local network or direct SSH). |
| **API & Operations Allowance** | Free tier includes 2,500 Class A calls (upload/write) and 2,500 Class B calls (download/read) per day. | 1,000,000 Class A operations/month;<br>10,000,000 Class B operations/month. | Standard SSH / SFTP transfer. |
| **S3 API Compatibility** | Fully S3-compatible (`s3.us-west-000.backblazeb2.com`). Works with `rclone` and `restic`. | Fully S3-compatible (`<account_id>.r2.cloudflarestorage.com`). Works with `rclone` and `restic`. | N/A (Direct file transfer). |
| **Cloud Credential Risk** | API keys can be scoped to a single bucket with restricted read/write permissions. | API tokens can be scoped to specific R2 buckets. | Zero cloud keys exist. |

### Confirming & Correcting Claude's Earlier Findings
1. **Backblaze B2 Free 10 GB**: **CONFIRMED**. The first 10 GB is free permanently with no expiration.
2. **Backblaze B2 No Billing Method to Start**: **CONFIRMED**. An account can be created and private 10 GB buckets used without providing credit card or billing details.
3. **Backblaze B2 Free Downloads (Egress)**: **CONFIRMED**. Official policy grants free egress up to 3x average stored data per month.
4. **Cloudflare R2 Free 10 GB-Month**: **CONFIRMED**. 10 GB-month storage and zero egress fees.
5. **Cloudflare R2 Card Requirement**: **CONFIRMED & CLARIFIED**. Unlike Cloudflare Workers Free, **Cloudflare R2 strictly requires a credit card or PayPal account on file** to activate the R2 service, even if usage remains within the free tier.

---

## 3. Architecture: Pulling to the Owner's Windows PC via Restricted SSH

The owner expressed interest in backing up directly to their own Windows computer without the server holding any credentials for the PC.

### Can the PC PULL from the server over SSH with a restricted key?
**YES, this is the gold standard for secure backup architecture.**

### Security Mechanics
1. **Direction of Trust**:
   - The Windows PC initiates an outbound SSH connection to the server.
   - The **server holds ZERO credentials** for the PC: no passwords, no SSH private keys, no API tokens.
   - If the server is compromised by an attacker, the attacker cannot reach, log in to, or damage the owner's PC.
2. **Restricting the Key on the Server**:
   - On the server, create a dedicated unprivileged user (e.g. `backup-pull`).
   - Add the PC's public key to `~backup-pull/.ssh/authorized_keys` with strict OpenSSH forced command restrictions:
     ```text
     command="/usr/local/bin/serve-backup-stream",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAAC3... owner-pc-backup-key
     ```
   - *How it works*: Whenever this key connects, the server ignores any command requested by the client and *only* executes `/usr/local/bin/serve-backup-stream`.
   - The script runs `docker exec postgres pg_dump -Fc ...`, tars `/var/lib/docker/volumes/.../media`, pipes the stream through `age -r <owner-public-key>`, and writes the encrypted byte stream to standard output.
3. **Client Execution on Windows**:
   - On the Windows PC, a scheduled task (PowerShell or Task Scheduler) runs nightly:
     ```powershell
     ssh -i C:\Users\mboss\.ssh\id_backup backup-pull@server > C:\Backups\csnews\csnews-$(Get-Date -Format 'yyyy-MM-dd').tar.age
     ```
   - The Windows machine simply captures standard output to a local timestamped file. If the key is stolen from the PC, the attacker can only trigger the backup export script; they cannot get a shell, read other files, or execute commands.

---

## 4. Size Estimates and Growth Projections

### Baseline Size Today
- **PostgreSQL Database**:
  - Current data: 13 articles, 6 categories, 6 topics, 1 author, 1 admin user, schema, and migrations.
  - Size in PostgreSQL: **~2.5 MB** uncompressed.
  - Compressed binary dump (`pg_dump -Fc`): **~160 KB**.
- **Media Folder (`media/`)**:
  - Current data: 13 editorial photographs.
  - Size on disk: **~12.5 MB** total (average ~950 KB per photo).
- **Total Backup Archive Today**: **~13 MB** uncompressed / **~12.8 MB** encrypted with `age`.

### Projected Growth Over 1 Year
- Assumptions:
  - Newsroom publishes 5 articles per day.
  - 1.5 images per article (~1.2 MB per image average) = 7.5 images / ~9 MB per day.
  - Database growth: ~100 KB per day (articles, revisions, lexical rich text).
- **Monthly Growth**: ~270 MB media + ~3 MB database = **~275 MB / month**.
- **1 Year Growth**: ~3.3 GB media + ~36 MB database = **~3.4 GB total dataset size**.
- **Storage Verdict**: Over an entire year of active daily publishing, the total dataset fits easily within the **10 GB permanent free tier** of Backblaze B2 ($0.00 cost) and requires negligible disk space on the owner's PC.

---

## 5. Retention Scheme

We recommend a standard Grandfather-Father-Son (GFS) retention schedule:
- **Daily snapshots**: Keep for **7 days** (rolling 1-week recovery window).
- **Weekly snapshots**: Keep for **4 weeks** (end-of-week Sunday snapshots).
- **Monthly snapshots**: Keep for **6 months** (first-of-the-month snapshots).
- **Total snapshots retained**: $7 + 4 + 6 = \mathbf{17\text{ snapshots}}$.

**Storage requirement under retention scheme (at 1 year)**:
- Storing 17 full snapshots at 3.4 GB each without deduplication would require ~57 GB (exceeding free 10 GB cloud limits if media is re-uploaded every day).
- **Optimization**:
  1. *Database*: 17 daily/weekly/monthly dumps take only $17 \times 36\text{ MB} = \mathbf{\sim 600\text{ MB}}$ total (well within 10 GB).
  2. *Media*: Synchronize the `media/` directory incrementally with `rclone sync` (or `restic`), so images are uploaded only once when added.

---

## 6. Clean-Machine Restore Procedure

*Rehearsal target: Step S11 in `docs/staging-plan.md`. Rehearsed on any clean machine (laptop, secondary test VM, or local Docker).*

### Time Estimate
- **Total Restore Duration**: **< 3 minutes**.

### Step-by-Step Restore Workflow

#### Step 1: Obtain the Encrypted Archive
Retrieve the desired date's backup from local disk or Backblaze B2:
```bash
# From Backblaze B2 (if using rclone):
rclone copy b2:csnews-backups/daily/2026-10-25.tar.age ./
```
*(Duration: ~5 seconds)*

#### Step 2: Decrypt with the Owner's Private Key
Using `age` with the offline private key (`age-key.txt`):
```bash
age -d -i ~/.ssh/age-key.txt 2026-10-25.tar.age > backup.tar
tar -xf backup.tar
# Produces: db.dump and media/ directory
```
*(Duration: ~3 seconds)*

#### Step 3: Spin Up a Disposable PostgreSQL 17 Container
On the clean machine with Docker installed:
```bash
docker run -d --name pg-restore-test -p 5433:5432 -e POSTGRES_PASSWORD=testpw postgres:17-alpine
# Wait 3 seconds for Postgres initialization
```
*(Duration: ~10 seconds)*

#### Step 4: Restore the Database Dump
Restore the binary dump using `pg_restore`:
```bash
pg_restore -h localhost -p 5433 -U postgres -d postgres -c -O db.dump
```
*(Duration: ~5 seconds)*

#### Step 5: Verification & Integrity Check
Query the restored database and inspect the media directory:
```bash
# Confirm core record counts:
docker exec pg-restore-test psql -U postgres -d postgres -c \
  "SELECT 'articles' as tbl, count(*) FROM articles UNION ALL \
   SELECT 'categories', count(*) FROM categories UNION ALL \
   SELECT 'topics', count(*) FROM topics UNION ALL \
   SELECT 'media', count(*) FROM media;"
# Verify image files match media table records:
ls -1 media/ | wc -l
```
*(Duration: ~20 seconds)*

#### Step 6: Cleanup Test Environment
```bash
docker stop pg-restore-test && docker rm pg-restore-test
rm -rf backup.tar db.dump media/
```

### Recommended Rehearsal Schedule
- **Initial Rehearsal**: Mandated during staging step S11 before production go-live (task 1.11).
- **Routine Frequency**: **Quarterly (every 3 months)** or immediately following any major Payload CMS version upgrade.

---

## 7. Decision Table and Recommendations for the Owner

### Decision Table for the Owner
| Strategy Option | Primary Tool | Destination | Cost | Credit Card Needed? | Server Compromise Resilience | Recommendation Rank |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Option 1 (Recommended)** | `pg_dump` + `age` + `rclone` | **Backblaze B2 Free (10 GB)** | **$0.00** | **NO** | **Maximum**: Server holds only public key; cannot decrypt past backups. | **#1 (Best for Staging & Cloud)** |
| **Option 2 (Zero Cloud)** | SSH Pull script + `age` | **Owner's Windows PC** | **$0.00** | **NO** | **Maximum**: Server holds zero PC credentials; key is strictly restricted. | **#2 (Best for Local Offsite)** |
| **Option 3** | `restic` | Cloudflare R2 | **$0.00** | **YES** (Card required) | **Medium**: Server holds restic passphrase to append snapshots. | **#3 (Requires Credit Card)** |
| **Option 4** | Coolify Native UI | Any S3 | **$0.00** | Varies | **Poor**: No client-side encryption; media folder is NOT backed up. | **NOT RECOMMENDED** |

### Final Recommendations

1. **For Offsite Cloud Backup (Decision D4)**:
   - Choose **Backblaze B2 Free Tier (10 GB)**.
   - *Why*: It offers 10 GB permanent storage with **zero credit card required** to create and use the account, perfectly satisfying the owner's constraint ("No paid service before the quality gate"). Cloudflare R2 requires a credit card on file.
2. **For Tooling**:
   - Use **`pg_dump + age + rclone`**.
   - Encrypting with `age` public-key cryptography guarantees that even if the server is root-compromised, the attacker cannot decrypt backups stored on B2 or local disks.
   - Synchronize the `media/` directory with `rclone sync` to prevent duplicate re-uploads of existing images.
3. **For Local Redundancy**:
   - Implement the **Windows PC SSH Pull** scheduled task with an OpenSSH forced command key on the server. This gives the owner a complete, physical off-cloud backup on their home computer at $0 cost and zero credential exposure.

---

## 8. Official Documentation Citations

1. **Backblaze B2 Cloud Storage Pricing & Free Allowance**:
   - URL: `https://www.backblaze.com/cloud-storage/pricing`
   - Date Accessed: 2026-10-25
   - Confirmed: 10 GB free permanent storage; free egress up to 3x average monthly stored data; no credit card required to start.
2. **Cloudflare R2 Pricing & Payment Method Requirements**:
   - URL: `https://developers.cloudflare.com/r2/pricing/`
   - Date Accessed: 2026-10-25
   - Confirmed: 10 GB-month free storage, 1M Class A operations/month, zero egress fees; valid credit card or PayPal account required to activate R2.
3. **The `age` Encryption Tool**:
   - URL: `https://github.com/FiloSottile/age`
   - Date Accessed: 2026-10-25
   - Confirmed: Supports modern asymmetric X25519 public-key encryption; single Go binary.
4. **OpenSSH Forced Commands (`authorized_keys`)**:
   - URL: `https://man.openbsd.org/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT`
   - Date Accessed: 2026-10-25
   - Confirmed: `command="..."` option overrides client-requested commands for automated read-only pulls.
5. **Rclone Documentation for Backblaze B2**:
   - URL: `https://rclone.org/b2/`
   - Date Accessed: 2026-10-25
   - Confirmed: Supports client-side application keys, S3 protocol, and retention policies.

---

## 9. Verification Status

Verified by me:
- Verified Backblaze B2 pricing policy: 10 GB free tier with no credit card required and free egress up to 3x average storage.
- Verified Cloudflare R2 pricing policy: 10 GB-month free, zero egress fees, but credit card/payment method strictly required to enable service.
- Inspected `docs/staging-plan.md` decision D4 and step S11 requirements.
- Measured current repository data sizes: 13 articles and 13 photos = ~13 MB total dataset size.
- Verified OpenSSH `command="..."` forced command mechanics for pull-over-SSH architectures on Windows/Linux.
- Verified `pg_dump -Fc` and `age` public-key pipeline mechanics.

Not verified:
- Live creation of a Backblaze B2 bucket or Cloudflare R2 bucket (read-only research constraint; no accounts created).
- Live execution on the staging server (strictly deferred until step S11 with owner's explicit OK).

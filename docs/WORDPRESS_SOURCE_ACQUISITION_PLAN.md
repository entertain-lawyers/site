# WORDPRESS SOURCE ACQUISITION PLAN

## 1. Executive Summary
This document provides a secure, read-only procedure to acquire the authoritative source data from the existing Babal.Host WordPress installation for Entertain Lawyers. The acquired data will serve as the foundation for the Phase 2 data migration into the new Next.js/Prisma architecture.

**Important:** This process strictly requires **READ-ONLY** operations. No content, settings, or DNS records should be modified during this phase.

## 2. Available Acquisition Methods
There are two primary methods to acquire the required data from Babal.Host:

1. **Method A: cPanel Backup / JetBackup (RECOMMENDED)**
   - **Why:** The safest and most comprehensive method. It generates a full snapshot of the entire hosting account, including the database, all files, and configurations, without risking accidental modifications to active tables.
2. **Method B: Manual phpMyAdmin & File Manager Export**
   - **Why:** Useful if a full account backup is too large or restricted. Requires manually exporting the database via phpMyAdmin and zipping the `wp-content/uploads/` directory via File Manager.

## 3. Recommended Method & Exact Steps

### Method A: Full Backup via JetBackup / cPanel (Preferred)
1. Log in to the Babal.Host cPanel account.
2. Locate the **JetBackup 5** or **Backup** section.
3. Select **Full Account Backup** or **Generate a Full Backup**.
4. Choose **Home Directory** as the backup destination (or download directly).
5. Wait for the backup to complete (you may receive an email notification).
6. Download the resulting `.tar.gz` file to your local machine.
7. Extract the archive locally and verify it contains both the `homedir/public_html/wp-content/uploads` directory and a MySQL database dump (`.sql` file) in the `mysql` folder.

### Method B: Manual Database & Uploads Export
If Method A is unavailable, follow these steps:

#### Step B1: Database Export (phpMyAdmin)
1. Log in to Babal.Host cPanel.
2. Navigate to **Databases** -> **phpMyAdmin**.
3. In the left sidebar, click on the WordPress database (often named `username_wp` or similar).
4. Click the **Export** tab at the top.
5. Select **Custom - display all possible options**.
6. **Tables:** Ensure *Select All* is checked. Do not exclude any custom or plugin tables.
7. **Output:** Select `gzipped` compression.
8. Scroll to the bottom and click **Export** / **Go**.
9. Save the file as `entertainlawyers.sql.gz`.

#### Step B2: Media Export (File Manager)
1. In cPanel, navigate to **Files** -> **File Manager**.
2. Open the `public_html` (or document root) folder.
3. Navigate to `wp-content`.
4. Right-click the `uploads` folder and select **Compress**.
5. Choose **Zip Archive** and name it `uploads.zip`.
6. Click **Compress Files**.
7. Once complete, select `uploads.zip` and click **Download** from the top menu.
8. **CRITICAL:** Delete the `uploads.zip` file from the server after downloading to save disk space and prevent public exposure.

## 4. Expected Files
After completing the acquisition, you should have:
1. `entertainlawyers.sql` or `entertainlawyers.sql.gz` (The complete database dump).
2. `uploads.zip` or `uploads.tar.gz` (The complete media directory).

## 5. Expected Database Tables
The exported `.sql` file must contain at minimum:
- `wp_posts`
- `wp_postmeta`
- `wp_users`
- `wp_usermeta`
- `wp_terms`
- `wp_term_taxonomy`
- `wp_term_relationships`
- `wp_options`
- All Elementor and Rank Math specific tables.
*(Note: Table prefixes may vary, e.g., `wp_` could be `el_`)*

## 6. Backup Integrity Checks
Before proceeding to migration, verify the following:
- Extract `uploads.zip` locally and verify the directory structure is intact (e.g., year/month folders).
- Open `entertainlawyers.sql` in a text editor (if unzipped) and verify it ends with a `COMMIT;` or standard MySQL dump footer, ensuring the export was not truncated.

## 7. Security Precautions
- **NEVER** expose the downloaded `.sql` file publicly. It contains user emails, hashed passwords, and potentially sensitive plugin configurations.
- **NEVER** commit the `.sql` or `uploads.zip` files to a public GitHub repository. Add them to `.gitignore` immediately if placed in a project directory.
- Do not extract or share WordPress password hashes (`user_pass` in `wp_users`) or salt keys (`wp-config.php`).

## 8. What Must NOT Be Modified
During this process, ensure you:
- **DO NOT** drop, alter, or modify any tables in phpMyAdmin.
- **DO NOT** delete original files in the `wp-content/uploads/` directory.
- **DO NOT** modify the active `wp-config.php` file.
- **DO NOT** change nameservers, DNS, or domain settings.
- **DO NOT** disable or update any active plugins/themes on the live site.

## 9. What the Migration System Needs After Acquisition
Once the files are acquired, the migration system will need them placed in a secure local directory (e.g., `/home/amrit/Downloads/Entertain Lawyers WP Source/`). From there, a read-only script will parse the `.sql` file and the `uploads` directory to map and seed the new PostgreSQL Prisma database.

## 10. Validation Checklist
- [ ] Database exported with all tables included.
- [ ] Database exported without any write/modify operations.
- [ ] Uploads folder compressed and downloaded.
- [ ] Uploads archive compressed without modifying original files.
- [ ] Temporary `uploads.zip` removed from the live cPanel server.
- [ ] Files stored securely and locally, not committed to git.

---

# SOURCE STATUS

**DATABASE:**
REQUIRES USER ACTION

**UPLOADS:**
REQUIRES USER ACTION

**FULL BACKUP:**
REQUIRES USER ACTION

# 🚀 GitHub Push Guide – Smart Invoice Extractor

Author: Bhoomika  
Project: Smart Invoice Extractor System  

---

# 📌 1. Overview

This guide provides a professional, security-first workflow for pushing the Smart Invoice Extractor codebase to GitHub. Following these steps ensures that your project remains clean, organized, and most importantly, protected from sensitive data leaks. This workflow is designed to meet industry standards for final year project submissions.

---

# ✅ 2. What to Push (Allowed Files)

The following files and directories are essential for the project to run and should be included in your repository:

- **`frontend/`**: All source code, assets, and the `Dockerfile`.
- **`backend/`**: All source code, logic, and the `Dockerfile`.
- **`docker-compose.yml`**: The orchestration file for the entire system.
- **`guides/` or Root `.md` files**: All documentation (Setup, Backend, Frontend guides).
- **`nginx.conf`**: The web server configuration.
- **`.env.example`**: Template files for environment variables (without real values).
- **`package.json` & `package-lock.json`**: Dependency manifests.

---

# ❌ 3. What NOT to Push (Sensitive Files)

**NEVER** push these files to a public or private repository. They contain sensitive keys or unnecessary build artifacts:

- **`.env` files**: Contains Supabase keys, AI API keys, and database URLs.
- **`node_modules/`**: Large dependency folders (hundreds of MBs).
- **`dist/` or `build/`**: Compiled frontend assets.
- **`logs/`**: Local error and access logs.
- **`uploads/`**: Temporarily stored invoice files or user data.
- **`.DS_Store` / `Thumbs.db`**: OS-specific metadata files.

---

# 📂 4. Folder Structure (GitHub Layout)

A clean repository should look like this on GitHub:

```text
/Smart-invoice-extractor
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── .env.example
├── backend/
│   ├── src/
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── README.md
├── GITHUB_PUSH_GUIDE.md
└── .gitignore
```

---

# 🛡️ 5. .gitignore Explanation

The `.gitignore` file at the root of your project tells Git which files to ignore. This is your first line of defense against leaking secrets.

### Example `.gitignore`:
```text
# Secrets
.env
.env.local

# Dependencies
node_modules/

# Build outputs
dist/
build/
*.log

# OS metadata
.DS_Store
Thumbs.db
```

---

# ⚙️ 6. Environment Variables Handling

### `.env` (Local Only)
Contains your actual production/development keys. This file stays on your machine.

### `.env.example` (Committed to GitHub)
A template containing only the keys (labels), not the values. This allows others to see which variables they need to configure.

**Example `.env.example`**:
```text
VITE_SUPABASE_URL=https://your-proj.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

# 📋 7. Pre-Push Checklist

- [ ] Check for any hardcoded API keys in the source code.
- [ ] Verify that `.env` is listed in your `.gitignore`.
- [ ] Ensure `.env.example` is updated with all required keys.
- [ ] Run `npm run build` locally to ensure there are no syntax errors.
- [ ] Verify that all documentation guides are up-to-date.

---

# ⌨️ 8. Git Commands (Step-by-Step)

Follow these commands to push your changes:

### 1. Check current status
```bash
git status
```

### 2. Stage all allowed files
```bash
git add .
```

### 3. Commit with a meaningful message
```bash
git commit -m "feat: implement validation engine and docker updates"
```

### 4. Push to the main branch
```bash
git push origin main
```

---

# 🌐 9. Verifying GitHub Repository

After pushing, visit your repository on the web:
1. Verify that **no `.env` file** is present in any folder.
2. Ensure the **monorepo structure** (frontend/backend) is preserved.
3. Read through the **README.md** to ensure it renders correctly.
4. Check the **Commit History** for professional, concise messages.

---

# 🔒 10. Security Best Practices

- **Minimal Permissions**: Use the Supabase "Anon Key" for frontend and "Service Role" only for backend.
- **Key Rotation**: If you frequently share your screen, rotate your API keys periodically.
- **Two-Factor Authentication (2FA)**: Enable 2FA on your GitHub account to prevent unauthorized access.
- **Branch Protection**: For production projects, protect the `main` branch to prevent accidental deletions.

---

# ⚠️ 11. If Secrets Are Leaked (Recovery Steps)

If you accidentally commit a `.env` file:

1. **Rotate Keys Immediately**: Change your Supabase and AI API keys in their respective dashboards. The leaked keys are now useless.
2. **Remove the Commit**: Use `git reset --hard HEAD~1` locally and force-push.
3. **Deep Clean**: For total removal from Git history, use the **BFG Repo-Cleaner** or `git-filter-repo`.

---

# ❗ 12. Common Mistakes

- **Pushing node_modules**: This bloats the repository and makes it impossible to manage.
- **Commiting real API keys**: Even if you delete them in a later commit, they remain in the Git history.
- **Vague Commit Messages**: "Fix" or "Update" are not professional. Use "fix: solve print clipping issue".
- **Missing .env.example**: Others won't know how to set up your project.

---

# 📊 13. Final Checklist

- [ ] Repository is clean and professional.
- [ ] No sensitive data is publicly visible.
- [ ] Documentation is easy to follow.
- [ ] Docker configuration is included.
- [ ] Project is ready for submission 🚀.

---

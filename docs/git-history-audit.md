# Git history audit

Audit date: 23 November 2026. Baseline: `4bfa55477772fb536d11805eae8413f96e019956`.

The public `main` branch had six commits. All six contained author and committer
timestamps. The last two were made on 6 September 2026 at 21:36:20 and 21:39:49
in Asia/Yerevan. A missing date label on the network graph was not missing Git
metadata.

The supplied archive contains source absent from that branch, including the PHP
backend, Mix Lab, Materials Market and stricter validation. Its `.git` directory
was not included, so this environment cannot recover any unpushed history from
the user's original computer. The imported snapshot records when the archive was
committed here; it does not claim that all imported work was written on that day.

The existing six commits are preserved. The repair branch records assisted work
with the environment's configured Codex identity and actual commit timestamps.
No dates were backdated or rewritten. Runtime databases, dependency directories,
compiled exports and nested delivery archives are excluded from the source
snapshot; the original uploaded archive remains unchanged.

The supplied Antigravity transcript also lists a separate Windows branch,
`fix/ia-audit-repairs`, and five reported commits from 22 November. Their Git
objects were not supplied with the archive. This branch records its own verified
23 November work and does not recreate the reported commits from a text table.
If the original local repository is recovered, its real branch history can be
preserved separately.

## Recording future work

Commit meaningful changes when they are made, then push the branch. File edits and ZIP creation do not create Git commits. A network graph groups date labels; inspect a commit or the history CSV to see both exact timestamps.

```bash
git status
git add <reviewed-files>
git commit -m "Describe the completed change"
git push -u origin <branch-name>
python backend/scripts/export_git_history.py /tmp/astramix-history.csv
```

The export command records full commit SHA, author date, committer date, author and subject. It reads existing metadata and cannot manufacture missing historical work. Current assisted repairs and the imported snapshot have present-day dates; they do not reconstruct when the original local edits were written.

## Publishing through the connected app

The terminal has no GitHub credentials. Publication through the authorized app creates current-dated GitHub commits with a Codex co-author attribution. Each published source tree is compared with its local preparation snapshot. The original remote commits remain ancestors; the local preparation branch is retained. Publication timestamps and local preparation timestamps describe different real actions and are not backdated.

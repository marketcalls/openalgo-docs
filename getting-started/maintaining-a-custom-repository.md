# Maintaining a Custom OpenAlgo Repository

You can keep your own OpenAlgo features and still receive updates from the OpenAlgo team. Keep your changes on a dedicated branch in your own GitHub fork, merge official updates into a temporary branch, test the result, and deploy the tested version.

For example, if you change a dashboard and OpenAlgo later releases a broker fix, this workflow lets you bring in the broker fix while retaining your dashboard changes. When both versions change the same code, Git asks you to resolve the difference. No update method can guarantee that custom code will remain compatible without review and testing.

This guide covers source-code customizations. For an installation without custom source changes, follow the [Upgrade guide](upgrade.md).

## Choose what you need to maintain

Before creating a fork, check whether your customization needs changes to OpenAlgo itself.

| What you want to keep | Recommended approach |
| --- | --- |
| Broker credentials, domain, ports, and other instance settings | Keep them in the installation's `.env` and back them up separately. |
| Your own Python strategy or an external application using the OpenAlgo API | Maintain the strategy or application in a separate repository where possible. |
| Custom chart indicators loaded by `/trading` | Use the supported custom indicator files under `strategies/indicators/`; back up your own files separately. |
| Changes to OpenAlgo pages, backend behavior, or broker integrations | Use a fork and a custom branch as described below. |

Files ignored by Git are not saved by a commit or a push. For example, personal strategy files, custom indicators, `.env`, databases, and keys need their own backup process. An existing tracked file also remains tracked even if a later `.gitignore` rule matches it.

## Understand the repository names

The examples use these names consistently:

| Name | Meaning |
| --- | --- |
| `upstream` | The official repository: `https://github.com/marketcalls/openalgo`. |
| `origin` | Your fork: `https://github.com/YOUR-GITHUB-USERNAME/openalgo`. |
| `main` | Your local copy of the official main branch. Keep personal changes off this branch in a new setup. |
| `custom` | Your maintained version, containing your changes and the official updates you have accepted. |
| `update/upstream-20261012` | A temporary branch where you combine and test an update. Use a new name each time. |
| `backup/custom-20261012` | A reference to your custom code before that update. It does not back up application data. |

Replace `YOUR-GITHUB-USERNAME` with your GitHub username. The dates are examples, not release numbers. Run commands one block at a time, and stop if a command fails.

The Git commands work in PowerShell, Git Bash, macOS, and Linux with a recent Git installation. Run them in a development checkout, separate from the directory serving live trades. Checking out a branch replaces files in that directory, even if a running application is still using them.

## 1. Set up your fork

Choose **one** of the following paths.

### Option A: Start a new custom repository

On [the official OpenAlgo repository](https://github.com/marketcalls/openalgo), select **Fork** and create a fork under your account. Then clone your fork:

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/openalgo.git openalgo-custom
cd openalgo-custom
git remote add upstream https://github.com/marketcalls/openalgo.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
git switch -c custom
git push -u origin custom
```

`--ff-only` updates a branch only when Git can move it forward without combining divergent histories. If it fails, stop and inspect your branch; do not force it to match upstream.

Check the result:

```bash
git remote -v
git branch -vv
```

`origin` should point to your account, `upstream` to `marketcalls/openalgo`, and `custom` should track `origin/custom`. The tracking relationship tells Git which remote branch belongs to your local branch.

### Option B: You already changed a clone of the official repository

You do not need to discard those changes or clone over your installation. First take a separate backup of the working directory, including uncommitted files and ignored data. If this is a live deployment, use a maintenance window and stop the application before changing its files.

Inspect the current state:

```bash
git status
git branch --show-current
git remote -v
```

Create a branch from the exact revision you are currently using:

```bash
git switch -c custom
```

Existing commits are retained, and uncommitted changes remain in the working directory. If `custom` already exists, inspect it and choose an unused branch name rather than overwriting it.

Review your edits and commit only the intended source files. For example, if you modified `frontend/src/pages/Trading.tsx`:

```bash
git diff -- frontend/src/pages/Trading.tsx
git add frontend/src/pages/Trading.tsx
git diff --cached
git commit -m "feat: customize the trading page"
```

Use the actual paths you changed; this is an example, not a required change. Review new files listed by `git status` as well, because `git diff` does not display untracked files. If your changes are already committed, skip this commit step.

Next, create a fork on GitHub. If `origin` currently points to `marketcalls/openalgo` and there is no `upstream` remote, rename it and add your fork:

```bash
git remote rename origin upstream
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/openalgo.git
git push -u origin custom
```

If `origin` already points to your fork, keep it and add `upstream` only if missing. Do not run the rename commands blindly on a different remote layout.

Your old `main` may still contain earlier personal commits. You can leave it alone: the update workflow below merges `upstream/main` directly into a branch based on `custom` and does not require resetting your old `main`.

## 2. Save personal changes as small commits

Continue working on `custom`, or create feature branches from it and merge them back after testing. Keep each commit focused on one change so you can understand and resolve it during future updates.

Before committing and pushing:

```bash
git status
git diff
git diff --cached
```

Stage specific files and check the staged diff before committing. Do not use `git add .` without checking what it includes. Never commit broker credentials, `.env`, API keys, signing keys, database backups, or logs. A private repository still needs the same care with secrets.

Push your committed work regularly:

```bash
git push origin custom
```

A Git stash is temporary local storage, not a maintained custom version and not a remote backup. Do not leave important customizations only in a stash.

## 3. Bring in an official update

### Prepare a clean starting point

Read the [release notes](../change-log/release/README.md) and finish, commit, or separately save your current work. Do not begin an update with unresolved edits.

```bash
git switch custom
git status
git fetch origin
git merge --ff-only origin/custom
git fetch upstream
```

`git status` must show a clean working tree before you continue. If the merge from `origin/custom` fails because both copies have new commits, reconcile those changes first. Do not overwrite another machine's work with a force push.

Create a reference to the current custom version and a branch for testing the update:

```bash
git branch backup/custom-20261012
git switch -c update/upstream-20261012
git log --oneline HEAD..upstream/main
git merge --no-ff upstream/main -m "Merge upstream OpenAlgo updates"
```

This merges the fetched official `main` into a copy of your custom branch. It does not replace your custom branch with the official code. `main` may contain changes newer than the most recent named release; the log shows what you are bringing in.

If Git reports conflicts, complete the next section before doing anything else. If the merge succeeds, go to the verification section. If it reports **Already up to date**, there are no new upstream commits to merge.

### Resolve a merge conflict

A conflict means Git needs a person to decide how two changes fit together. List the affected files:

```bash
git status
git diff --name-only --diff-filter=U
```

Open each file in your editor. During this merge, **ours** is the custom update branch and **theirs** is `upstream/main`. Git marks the conflicting sections with these lines:

| Marker | Meaning |
| --- | --- |
| `<<<<<<< HEAD` | The custom version starts below this line. |
| `=======` | The incoming official version starts below this separator. |
| `>>>>>>> upstream/main` | The conflicting section ends here. |

Edit the file to retain the intended custom behavior and the relevant upstream changes, then remove the markers. Do not select **Accept All Current** or **Accept All Incoming** across the project: that can discard either official fixes or your customization.

Stage the resolved files individually. For a conflict in the trading page, for example:

```bash
git add frontend/src/pages/Trading.tsx
git diff --name-only --diff-filter=U
git diff --cached
git diff --cached --check
git commit -m "Merge upstream updates and resolve custom changes"
```

Before committing, the unresolved-file command must return no filenames. A merge commit records the resolution; it does not prove that the resulting application works.

For dependency conflicts, resolve the intended dependency changes before regenerating the corresponding lockfile with the project's package manager. For generated `frontend/dist` conflicts, resolve the frontend source first and rebuild the bundle; do not hand-edit minified JavaScript. See the frontend notes below.

If you cannot resolve the merge, return to the pre-merge state of this temporary branch:

```bash
git merge --abort
git switch custom
```

`git merge --abort` applies only while a merge is in progress. Starting from a clean tree makes this recovery reliable. Your `custom` branch has not yet been advanced to the update.

### Optional: Choose a specific release instead of current main

If you want to adopt a particular release, find the exact tag or commit in the official release information. Do not assume a tag exists for every displayed application version.

```bash
git fetch upstream --tags
git tag --list
```

In the merge step above, use the verified release tag or full commit ID instead of `upstream/main`. Use a fresh temporary branch from the pre-update custom version. Merging an older tag into a branch that already contains newer commits does not downgrade it.

## 4. Verify the combined version

Test in a separate installation with its own configuration and data before changing a live deployment. Do not run two instances against the same database files or automatically start copied live strategies. Keep test execution in sandbox/analyzer mode.

Review the files changed by the update:

```bash
git diff --stat backup/custom-20261012..HEAD
git diff backup/custom-20261012..HEAD -- .sample.env pyproject.toml uv.lock frontend/package.json frontend/package-lock.json
git status
```

Follow the [Upgrade guide](upgrade.md) for configuration, dependencies, and migrations appropriate to your installation. For a local test checkout, the dependency and migration commands are:

```bash
uv sync
uv run upgrade/migrate_all.py
```

Run migrations only after backing up the test data you intend to retain. Stop if a required migration fails. Review new `.sample.env` entries and copy only the needed settings into your existing `.env`; preserve existing secrets and keys.

### Frontend customizations need a fresh build

OpenAlgo's official `main` includes a frontend bundle built by its CI. That bundle represents the official source; it does not automatically include your own React changes. Even if a source merge succeeds, the inherited bundle can still show the official UI.

When your custom version changes frontend code or dependencies, build from the merged source with a Node.js version supported by `frontend/package.json`:

```bash
cd frontend
npm ci
npm run build
cd ..
```

`frontend/dist/` is ignored for normal development but can contain files already tracked in the official branch. A local build can therefore show tracked changes, and new hashed assets can be ignored. In a dedicated build checkout, if you deliberately publish a complete bundle in your custom branch, review it and stage the **entire** generated directory:

```bash
git add -f -- frontend/dist
git diff --cached --stat
git status
git commit -m "build: refresh frontend for custom deployment"
```

Do not run that commit if nothing changed. Alternatively, build a deployment artifact or custom Docker image from the tested source and keep build output out of your development commits. Never publish a partial bundle. Do not assume the upstream CI will build and commit assets on a branch called `custom` in your fork.

### Check the behavior you actually use

Confirm that:

1. OpenAlgo starts, login works, and the intended custom feature is present.
2. Broker login, symbol lookup, and market data work for your setup.
3. The updated pages load without missing frontend assets; `/trading` and `/scalping` work if you use them.
4. Your strategies, order handling, and risk controls behave as expected in sandbox/analyzer mode.
5. Relevant automated checks for the files you changed pass, and application logs show no new failures.

A clean Git merge only proves the files could be combined. It cannot establish that your customization is compatible with a changed API, database schema, or broker response.

## 5. Promote and push the tested version

Finish any resolution or intentional build commits first. With a clean working tree and verification complete:

```bash
git switch custom
git merge --ff-only update/upstream-20261012
git push origin custom
```

If the fast-forward fails, `custom` has moved since the update branch was created. Combine those newer changes on the temporary branch, test again, and retry. If the push is rejected because the remote changed, fetch and reconcile it before pushing; do not force-push the shared custom branch.

Record the exact tested revision:

```bash
git rev-parse HEAD
```

Keep that ID with your deployment notes, the upstream version you adopted, and the location of the matching data backup.

## 6. Update the installation from your custom branch

### Back up code and application data separately

Before deployment, pause automated entries and scheduled strategies, handle any open orders and positions, and stop the application and other writers before taking file-based database backups. Perform this during a maintenance window.

Back up the existing deployment's `.env`, keys, personal strategies and indicators, and all configured database stores. Default stores include `openalgo.db`, `logs.db`, `latency.db`, `health.db`, `sandbox.db`, and `historify.duckdb`; use the actual locations configured for your instance. Preserve associated database files needed for a consistent backup. For Docker, back up the actual mounted volumes as well as host configuration.

The current native updater's automatic database copy omits `health.db` and is not a complete backup of your installation. See [Upgrade Procedure: Backup Requirements](../developers/design-documentation/30-upgrade-procedure.md#backup-requirements). A `backup/...` Git branch saves committed code only, not these files.

### Native and desktop installations

In the deployment checkout, confirm the remote and branch before running an updater:

```bash
git remote -v
git branch -vv
git status
```

For this workflow, `origin` must point to your fork and the checked-out branch must be `custom`, with a clean working tree. If the deployment does not yet have that branch, after saving its existing changes and stopping the application, fetch your fork and create the local branch:

```bash
git fetch origin
git switch -c custom --track origin/custom
```

If the local branch already exists, use `git switch custom` instead. Do not create it a second time.

Both `install/update.sh` and `install/update.bat` run `git pull origin` for the current branch. They do **not** fetch and merge `upstream/main` for you. Push the tested update to `origin/custom` before updating the installation, then follow the commands for your installation in the [Upgrade guide](upgrade.md).

The update scripts can stash tracked local edits and leave them unapplied. This is why custom source changes must be committed and pushed before deployment. If an updater reports a stash, inspect `git stash list` and `git stash show -p 'stash@{0}'` before deciding what to restore. Do not blindly reapply old generated assets over a new build.

For frontend customizations, deploy the complete bundle built from your tested custom revision or build it as part of your deployment. The native updater does not guarantee a rebuild whenever an existing `frontend/dist` is stale. Arrange the build before restarting or accepting traffic; otherwise the server can serve a mixture of versions.

After the update, compare `git rev-parse HEAD` with the tested revision and repeat the relevant application checks before resuming automation. Restart with your installation's normal launcher or service configuration.

### Docker installations

The official `marketcalls/openalgo` image contains official code. Pulling it will not include your private source changes. Build from the tested custom checkout, or publish and deploy your own image.

For a Compose installation whose service is named `openalgo` and whose `build.context` points to this checkout, after backups and switching to the tested custom branch:

```bash
docker compose build openalgo
docker compose up -d --no-deps openalgo
docker compose ps
docker compose logs --tail=100 openalgo
```

The repository's Dockerfile builds the frontend from source. If your Compose file was changed to use only a pre-built image, configure a build or point it to your own built image first. Adapt the service name and Compose files to your installed layout.

Keep the existing Compose project name and mounted volumes. Running Compose from a different directory can create a different project with new, empty volumes. Do not use `docker compose down -v` during an update: it removes named volumes. Existing volumes mounted over paths such as `/app/strategies` can also hide files supplied in a new image; manage and back up personal strategy files separately.

## 7. Recover if an update fails

### Before deployment

If verification fails on the temporary branch, do not promote it. Fix the problem there or return to `custom` once any in-progress merge has been aborted and your working tree is clean. The earlier maintained branch remains available.

To inspect or repair the saved code without rewriting branch history:

```bash
git switch -c recovery/custom-20261012 backup/custom-20261012
```

This is a recovery source branch, not an instruction to run the updater: an updater may try to pull the same branch name from `origin`, where it may not exist.

### After deployment

Stop the application and automation, then restore the previous tested source revision or custom image and its compatible dependencies and frontend bundle. If migrations changed the data format, restore the matching database backup and configuration/keys as needed. Rolling back code alone may leave it incompatible with the upgraded database.

Restoring a database does not undo orders or trades at the broker. Reconcile actual broker positions and orders before resuming strategies. A backup also predates any changes made after it was taken; review that gap before restoring it.

Avoid `git reset --hard`, `git clean -fdx`, and force pushes as routine update instructions. They can remove local work or ignored installation data and are unnecessary for the merge workflow above.

## Common questions

### Can I use GitHub's Sync fork button?

It can update the selected branch of your fork on GitHub. It does not update your local files, combine another custom branch, rebuild your frontend, run migrations, or deploy your server. Check which branch you selected; keeping the fork's `main` current is separate from updating `custom`. See GitHub's [Syncing a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork) instructions.

### Why use merge instead of rebase?

This guide uses merge to preserve the history of a long-lived custom branch without requiring a history rewrite. Rebase is an option for experienced developers with unpublished feature commits, but rebasing a shared deployment branch changes commit IDs and complicates coordination. See the [Git merge reference](https://git-scm.com/docs/git-merge) for how merge and abort work.

### Will every update require manual conflict resolution?

No. Git can combine many changes automatically. Conflicts are more likely when your customizations repeatedly edit the same sections as upstream. Keep personal changes small, prefer supported extension points, and adopt updates regularly enough that each review remains manageable.

### Can I contribute my feature to OpenAlgo?

Yes. Propose a focused change against the official repository with a clear explanation and verification. If an equivalent feature is accepted upstream, you can retire the overlapping custom code in a later update and reduce future maintenance.

### What should I keep in my update notes?

Record the previous custom commit, the upstream tag or commit merged, the tested custom commit deployed, dependency or configuration changes, migration results, behavior checked in sandbox/analyzer mode, and the matching backup location. These notes make the next update and any recovery much easier.

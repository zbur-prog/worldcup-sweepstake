# Family World Cup Sweepstake HQ

Static website for the family World Cup sweepstake.

## What it does

- Shows Golden Boot leaderboard: total goals scored by each player's 3 teams.
- Shows Best Average Team leaderboard: Tier 2 teams ranked by points, goal difference, goals for, games played.
- Shows full player allocations.
- Updates `data/results.json` automatically twice a day using GitHub Actions.

## Setup on GitHub Pages

1. Create a new public GitHub repo called `worldcup-sweepstake` under `zburjony`.
2. Upload all files from this folder to the repo.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Save.
6. Your site should appear at:
   `https://zburjony.github.io/worldcup-sweepstake/`

## Automatic updates

The workflow is in `.github/workflows/update-results.yml`.

It runs twice daily using UTC times:

- `0 20 * * *` = about 8:00am Auckland during NZST
- `0 8 * * *` = about 8:00pm Auckland during NZST

You can also run it manually from **Actions → Update World Cup results → Run workflow**.

## Data source

The script tries to fetch completed matches from:

`https://worldcup26.ir/get/games`

If the API is unavailable, it falls back to the initial score set included in the repo so the site still loads.

## Change update times

Edit `.github/workflows/update-results.yml` and adjust the cron lines. GitHub cron uses UTC.

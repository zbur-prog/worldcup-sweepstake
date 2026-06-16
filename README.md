# Family World Cup Sweepstake

Clean rebuild with one clear Golden Boot CSS section.

## Golden Boot column widths

Edit `styles.css` and change only these values:

```css
--gb-rank: 34px;
--gb-player: 100px;
--gb-teams: 82px;
--gb-score: 34px;
```

Mobile values are lower down inside the `@media (max-width: 760px)` block.

## Automation

The workflow is at `.github/workflows/update-results.yml` and runs hourly plus manual `Run workflow`.
It currently updates `data/results.json -> generatedAt`.

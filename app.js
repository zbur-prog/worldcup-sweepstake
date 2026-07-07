const byId = (id) => document.getElementById(id);

const PRIZES = {
  winner: '$80',
  average: '$25',
  golden: '$15'
};

const fmtDate = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-NZ', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Pacific/Auckland'
    }).format(new Date(iso));
  } catch { return iso || 'Unknown'; }
};

const medals = ['🥇','🥈','🥉'];
const gf = (team) => team?.goalsFor || 0;
const ga = (team) => team?.goalsAgainst || 0;
const gp = (team) => team?.played || 0;
const pts = (team) => team?.points || 0;
const gd = (team) => gf(team) - ga(team);

const stageRank = {
  'Grp': 1,
  'R32': 2,
  'R16': 3,
  'QF': 4,
  'SF': 5,
  'Final': 6,
  'Runner-up': 7,
  'Winner': 8
};
const knockoutStages = ['R32', 'R16', 'QF', 'SF', 'Final'];
const nextStage = { R32: 'R16', R16: 'QF', QF: 'SF', SF: 'Final', Final: 'Winner' };

function normalizeStage(value) {
  const s = String(value || '').trim().toUpperCase().replace(/[-_\s]/g, '');
  if (['R32','ROUND32','ROUNDOF32'].includes(s)) return 'R32';
  if (['R16','ROUND16','ROUNDOF16'].includes(s)) return 'R16';
  if (['QF','QUARTERFINAL','QUARTERFINALS'].includes(s)) return 'QF';
  if (['SF','SEMIFINAL','SEMIFINALS'].includes(s)) return 'SF';
  if (['FINAL'].includes(s)) return 'Final';
  return null;
}

function teamCell(code, teams, compact = false) {
  const t = teams[code];
  if (!t) return code;
  return compact ? `${t.flag}` : `${t.flag} ${code}`;
}

function playerTotals(player, teams) {
  const codes = [player.t1, player.t2, player.t3];
  return {
    ...player,
    codes,
    goals: codes.reduce((sum, c) => sum + gf(teams[c]), 0),
    games: codes.reduce((sum, c) => sum + gp(teams[c]), 0),
    gd: codes.reduce((sum, c) => sum + gd(teams[c]), 0),
  };
}

function getWinner(match) {
  const explicit = match.winner || match.winnerTeam || match.winnerCode || match.qualified || match.advances;
  if (explicit) return explicit;

  const hp = Number(match.homePenalties ?? match.homePenaltyGoals ?? match.homePens);
  const ap = Number(match.awayPenalties ?? match.awayPenaltyGoals ?? match.awayPens);
  if (Number.isFinite(hp) && Number.isFinite(ap) && hp !== ap) {
    return hp > ap ? match.home : match.away;
  }

  if (!Number.isFinite(Number(match.homeGoals)) || !Number.isFinite(Number(match.awayGoals))) return null;
  if (match.homeGoals > match.awayGoals) return match.home;
  if (match.awayGoals > match.homeGoals) return match.away;
  return null;
}

function getGroupRanking(teams) {
  const byGroup = {};
  Object.entries(teams).forEach(([code, team]) => {
    if (!team.group) return;
    (byGroup[team.group] ||= []).push({ code, ...team, gd: gd(team) });
  });

  const topTwo = new Set();
  const thirds = [];

  Object.entries(byGroup).forEach(([group, rows]) => {
    const sorted = rows.sort((a,b) =>
      pts(b) - pts(a) || b.gd - a.gd || gf(b) - gf(a) || a.name.localeCompare(b.name)
    );
    sorted.slice(0, 2).forEach(r => topTwo.add(r.code));
    if (sorted[2]) thirds.push(sorted[2]);
  });

  thirds.sort((a,b) => pts(b) - pts(a) || b.gd - a.gd || gf(b) - gf(a) || a.name.localeCompare(b.name));
  const bestThirds = new Set(thirds.slice(0, 8).map(r => r.code));
  return new Set([...topTwo, ...bestThirds]);
}

function deriveTeamStatus(teams, matches) {
  const status = {};
  Object.keys(teams).forEach(code => {
    status[code] = { code, result: 'Grp', alive: false, winner: false, eliminated: true };
  });

  const knockoutMatches = (matches || [])
    .map(m => ({ ...m, stage: normalizeStage(m.group || m.stage || m.round) }))
    .filter(m => knockoutStages.includes(m.stage));

  const qualifiers = getGroupRanking(teams);
  qualifiers.forEach(code => {
    if (status[code]) status[code] = { code, result: 'R32', alive: true, winner: false, eliminated: false };
  });

  knockoutMatches.sort((a,b) => stageRank[a.stage] - stageRank[b.stage]);

  for (const m of knockoutMatches) {
    const home = m.home;
    const away = m.away;
    const winner = getWinner(m);
    const loser = winner === home ? away : winner === away ? home : null;

    [home, away].forEach(code => {
      if (!status[code]) status[code] = { code, result: m.stage, alive: true, winner: false, eliminated: false };
      if (stageRank[m.stage] > stageRank[status[code].result]) status[code].result = m.stage;
      status[code].alive = true;
      status[code].eliminated = false;
    });

    if (loser && status[loser]) {
      status[loser].result = m.stage === 'Final' ? 'Runner-up' : m.stage;
      status[loser].alive = false;
      status[loser].eliminated = true;
    }

    if (winner && status[winner]) {
      status[winner].result = nextStage[m.stage] || m.stage;
      status[winner].alive = m.stage !== 'Final';
      status[winner].winner = m.stage === 'Final';
      status[winner].eliminated = false;
    }
  }

  return status;
}

function statusBadge(status) {
  if (!status) return 'Grp';
  if (status.winner) return '🏆 Winner';
  if (status.alive) return `<span class="live-badge">${status.result}</span>`;
  return `<span class="out-badge">${status.result}</span>`;
}

function sortByPrizeStage(a, b) {
  return stageRank[b.result] - stageRank[a.result]
    || pts(b.team) - pts(a.team)
    || gd(b.team) - gd(a.team)
    || gf(b.team) - gf(a.team)
    || a.player.localeCompare(b.player);
}

function renderPrizeCards(players, teams, rows, teamStatus) {
  const winnerTeam = Object.values(teamStatus).find(s => s.winner)?.code;
  const winnerPlayers = winnerTeam
    ? players.filter(p => [p.t1, p.t2, p.t3].includes(winnerTeam))
    : [];

  const contenders = players.map(p => {
    const aliveCodes = [p.t1, p.t2, p.t3].filter(c => teamStatus[c]?.alive || teamStatus[c]?.winner);
    const best = aliveCodes.map(c => teamStatus[c]).sort((a,b) => stageRank[b.result] - stageRank[a.result])[0];
    return { player: p.name, codes: aliveCodes, bestStage: best?.result || 'Grp' };
  }).filter(r => r.codes.length)
    .sort((a,b) => b.codes.length - a.codes.length || stageRank[b.bestStage] - stageRank[a.bestStage] || a.player.localeCompare(b.player));

  const averageRows = buildAverageRows(players, teams, teamStatus);
  const goldenLeader = rows[0];

  byId('prizeCards').innerHTML = `
    <section class="prize-card card">
      <div class="prize-head"><h2>🥇 Prize 1 – World Cup Winner</h2><span>${PRIZES.winner}</span></div>
      ${winnerTeam ? `
        <div class="prize-main">${teamCell(winnerTeam, teams)} confirmed</div>
        <div class="mini-list">${winnerPlayers.map(p => `<div>${p.name}</div>`).join('')}</div>
      ` : `
        <div class="prize-main">${contenders.length} contenders alive</div>
        <div class="mini-list">${contenders.slice(0, 6).map(r => `<div><strong>${r.player}</strong> ${r.codes.map(c => teamCell(c, teams, true)).join(' ')}</div>`).join('')}</div>
      `}
    </section>

    <section class="prize-card card">
      <div class="prize-head"><h2>🥈 Prize 2 – Best Average Team</h2><span>${PRIZES.average}</span></div>
      <div class="prize-main">${averageRows[0] ? `${averageRows[0].player} • ${teamCell(averageRows[0].code, teams)}` : 'Waiting...'}</div>
      <div class="mini-list">${averageRows.slice(0, 3).map((r,i) => `<div>${medals[i] || i+1} ${r.player} — ${teamCell(r.code, teams)} • ${r.result}</div>`).join('')}</div>
    </section>

    <section class="prize-card card">
      <div class="prize-head"><h2>⚽ Prize 3 – Golden Boot</h2><span>${PRIZES.golden}</span></div>
      <div class="prize-main">${goldenLeader ? `${goldenLeader.name} • ${goldenLeader.goals} goals` : 'Waiting...'}</div>
      <div class="mini-list">${rows.slice(0, 3).map((r,i) => `<div>${medals[i] || i+1} ${r.name} — ${r.goals} goals / ${r.games} GP</div>`).join('')}</div>
    </section>
  `;
}

function renderTopCards(rows, teams, teamStatus) {
  const leader = rows[0];
  const spoon = rows[rows.length - 1];
  const carriers = rows.map(r => {
    const best = r.codes.map(c => ({ code: c, goals: gf(teams[c]) })).sort((a,b) => b.goals - a.goals)[0];
    const pct = r.goals ? Math.round(best.goals / r.goals * 100) : 0;
    return { player: r.name, code: best.code, goals: best.goals, pct };
  }).sort((a,b) => b.pct - a.pct || b.goals - a.goals)[0];
  const aliveTeams = Object.values(teamStatus).filter(s => s.alive).length;

  byId('topCards').innerHTML = `
    <div class="card stat"><div class="label">Golden Boot Leader</div><div class="value">${leader.name}</div><div class="detail">${leader.goals} goals from ${leader.games} games</div></div>
    <div class="card stat"><div class="label">Teams Still Alive</div><div class="value">${aliveTeams}</div><div class="detail">Current knockout contenders</div></div>
    <div class="card stat"><div class="label">Wooden Spoon Watch</div><div class="value">${spoon.name}</div><div class="detail">${spoon.goals} goals from ${spoon.games} games</div></div>
    <div class="card stat"><div class="label">Carrying Job</div><div class="value">${teamCell(carriers.code, teams)}</div><div class="detail">${carriers.pct}% of ${carriers.player}'s goals</div></div>
  `;
}

function renderGolden(rows, teams) {
  byId('goldenBody').innerHTML = rows.map((r, i) => `
    <tr>
      <td class="col-rank">${medals[i] || (i + 1)}</td>
      <td class="col-player" title="${r.name}">${r.name}</td>
      <td class="col-teams team-flags" title="${r.codes.map(c => teams[c]?.name || c).join(' / ')}">${r.codes.map(c => teamCell(c, teams, true)).join(' ')}</td>
      <td class="col-goals num">${r.goals}</td>
      <td class="col-games num">${r.games}</td>
    </tr>
  `).join('');
}

function buildAverageRows(players, teams, teamStatus) {
  return players.map(p => {
    const t = teams[p.t2] || {};
    const s = teamStatus[p.t2] || { result: 'Grp', alive: false };
    return {
      player: p.name,
      code: p.t2,
      team: t,
      result: s.result,
      alive: s.alive,
      winner: s.winner,
      pts: pts(t),
      gd: gd(t),
      gf: gf(t)
    };
  }).sort(sortByPrizeStage);
}

function renderAverage(players, teams, teamStatus) {
  const rows = buildAverageRows(players, teams, teamStatus);
  byId('averageBody').innerHTML = rows.map((r,i) => `
    <tr class="${r.alive || r.winner ? 'alive-row' : 'out-row'}">
      <td>${medals[i] || i+1}</td>
      <td>${r.player}</td>
      <td>${teamCell(r.code, teams)}</td>
      <td>${statusBadge(r)}</td>
      <td>${r.pts}</td>
      <td>${r.gd > 0 ? '+' : ''}${r.gd}</td>
      <td>${r.gf}</td>
    </tr>
  `).join('');
}

function renderWinnerTable(players, teams, teamStatus) {
  const rows = players.map(p => {
    const teamRows = [p.t1, p.t2, p.t3].map(c => ({ code: c, status: teamStatus[c], team: teams[c] }));
    const best = [...teamRows].sort((a,b) => stageRank[b.status?.result || 'Grp'] - stageRank[a.status?.result || 'Grp'])[0];
    const alive = teamRows.filter(x => x.status?.alive || x.status?.winner);
    return { player: p.name, teamRows, best, aliveCount: alive.length };
  }).sort((a,b) =>
    b.aliveCount - a.aliveCount
    || stageRank[b.best.status?.result || 'Grp'] - stageRank[a.best.status?.result || 'Grp']
    || a.player.localeCompare(b.player)
  );

  byId('winnerBody').innerHTML = rows.map((r,i) => `
    <tr class="${r.aliveCount ? 'alive-row' : 'out-row'}">
      <td>${medals[i] || i+1}</td>
      <td>${r.player}</td>
      <td class="team-flags">${r.teamRows.map(x => teamCell(x.code, teams, true)).join(' ')}</td>
      <td>${r.aliveCount}</td>
      <td>${statusBadge(r.best.status)}</td>
    </tr>
  `).join('');
}

function renderDraw(players, teams) {
  byId('drawBody').innerHTML = players.map(p => `
    <tr><td>${p.name}</td><td>${teamCell(p.t1, teams)}</td><td>${teamCell(p.t2, teams)}</td><td>${teamCell(p.t3, teams)}</td></tr>
  `).join('');
}

function renderBanter(rows, teams, banterLines = []) {
  if (Array.isArray(banterLines) && banterLines.length) {
    byId('banter').innerHTML = banterLines.map(line => `<div class="banter-item">${line}</div>`).join('');
    return;
  }

  const leader = rows[0];
  const best = leader.codes.map(c => ({ code:c, goals:gf(teams[c]) })).sort((a,b)=>b.goals-a.goals)[0];
  byId('banter').innerHTML = `
    <div class="banter-item">${teamCell(best.code, teams)} is currently doing the heavy lifting for ${leader.name}.</div>
    <div class="banter-item">${leader.name} leads the Golden Boot race with ${leader.goals} goals from ${leader.games} games.</div>
    <div class="banter-item">All complaints about the draw remain formally ignored.</div>
  `;
}

function renderScores(matches, teams) {
  byId('scores').innerHTML = (matches || []).slice().reverse().map(m => {
    const hp = Number(m.homePenalties ?? m.homePenaltyGoals ?? m.homePens);
    const ap = Number(m.awayPenalties ?? m.awayPenaltyGoals ?? m.awayPens);
    const pens = Number.isFinite(hp) && Number.isFinite(ap) ? ` (${hp}-${ap} pens)` : '';
    return `<div class="score-row"><span>${teams[m.home]?.flag || ''} ${m.home} ${m.homeGoals} - ${m.awayGoals} ${m.away} ${teams[m.away]?.flag || ''}${pens}</span><strong>${normalizeStage(m.group || m.stage || m.round) || m.group || m.status}</strong></div>`;
  }).join('');
}

function renderGroups(teams) {
  const groups = {};
  Object.entries(teams).forEach(([code,t]) => {
    if (!t.group || !/^[A-L]$/.test(t.group)) return;
    (groups[t.group] ||= []).push({code, ...t, gd: gd(t)});
  });
  byId('groups').innerHTML = Object.keys(groups).sort().map(g => {
    const rows = groups[g].sort((a,b)=> b.points-a.points || b.gd-a.gd || b.goalsFor-a.goalsFor || a.name.localeCompare(b.name));
    return `<div class="group-card"><h3>Group ${g}</h3><div class="table-wrap"><table><thead><tr><th>Team</th><th>Pts</th><th>GP</th><th>GF</th><th>GD</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.flag} ${r.code}</td><td>${r.points}</td><td>${r.played}</td><td>${r.goalsFor}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
}

async function main() {
  const res = await fetch('data/results.json?cache=' + Date.now());
  const data = await res.json();
  const teams = data.teams;
  const players = data.players || [];
  const matches = data.matches || [];
  const teamStatus = deriveTeamStatus(teams, matches);
  const rows = players.map(p => playerTotals(p, teams))
    .sort((a,b) => b.goals - a.goals || b.gd - a.gd || a.games - b.games || a.name.localeCompare(b.name));

  byId('lastUpdated').textContent = fmtDate(data.generatedAt);
  renderPrizeCards(players, teams, rows, teamStatus);
  renderTopCards(rows, teams, teamStatus);
  renderWinnerTable(players, teams, teamStatus);
  renderAverage(players, teams, teamStatus);
  renderGolden(rows, teams);
  renderDraw(players, teams);
  renderBanter(rows, teams, data.banter);
  renderScores(matches, teams);
  renderGroups(teams);
}

main().catch(err => {
  console.error(err);
  byId('lastUpdated').textContent = 'Error loading data';
});

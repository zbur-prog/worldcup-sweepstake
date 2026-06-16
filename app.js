const byId = (id) => document.getElementById(id);

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
const gd = (team) => gf(team) - ga(team);

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

function renderTopCards(rows, teams) {
  const leader = rows[0];
  const spoon = rows[rows.length - 1];
  const carriers = rows.map(r => {
    const best = r.codes.map(c => ({ code: c, goals: gf(teams[c]) })).sort((a,b) => b.goals - a.goals)[0];
    const pct = r.goals ? Math.round(best.goals / r.goals * 100) : 0;
    return { player: r.name, code: best.code, goals: best.goals, pct };
  }).sort((a,b) => b.pct - a.pct || b.goals - a.goals)[0];
  const bestAverage = [...rows].sort((a,b) => gf(teams[b.t2]) - gf(teams[a.t2]))[0];
  byId('topCards').innerHTML = `
    <div class="card stat"><div class="label">Current Leader</div><div class="value">${leader.name}</div><div class="detail">${leader.goals} goals from ${leader.games} games</div></div>
    <div class="card stat"><div class="label">Best Average Team</div><div class="value">${teamCell(bestAverage.t2, teams)}</div><div class="detail">${bestAverage.name} • ${gf(teams[bestAverage.t2])} goals</div></div>
    <div class="card stat"><div class="label">Wooden Spoon Watch</div><div class="value">${spoon.name}</div><div class="detail">${spoon.goals} goals from ${spoon.games} games</div></div>
    <div class="card stat"><div class="label">Carrying Job</div><div class="value">${teamCell(carriers.code, teams)}</div><div class="detail">${carriers.pct}% of ${carriers.player}'s goals</div></div>
  `;
}

function renderGolden(rows, teams) {
  byId('goldenBody').innerHTML = rows.map((r, i) => `
    <tr>
      <td class="col-rank">${medals[i] || (i + 1)}</td>
      <td class="col-player" title="${r.name}">${r.name}</td>
      <td class="col-teams team-flags" title="${r.codes.map(c => teams[c].name).join(' / ')}">${r.codes.map(c => teamCell(c, teams, true)).join(' ')}</td>
      <td class="col-goals num">${r.goals}</td>
      <td class="col-games num">${r.games}</td>
    </tr>
  `).join('');
}

function renderAverage(players, teams) {
  const rows = players.map(p => ({ player: p.name, code: p.t2, ...teams[p.t2], gd: gd(teams[p.t2]) }))
    .sort((a,b) => b.points - a.points || b.gd - a.gd || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  byId('averageBody').innerHTML = rows.map((r,i) => `
    <tr><td>${medals[i] || i+1}</td><td>${r.flag} ${r.code || ''} ${r.name}</td><td>${r.player}</td><td>${r.points}</td><td>${r.gd}</td><td>${r.goalsFor}</td></tr>
  `).join('');
}

function renderDraw(players, teams) {
  byId('drawBody').innerHTML = players.map(p => `
    <tr><td>${p.name}</td><td>${teamCell(p.t1, teams)}</td><td>${teamCell(p.t2, teams)}</td><td>${teamCell(p.t3, teams)}</td></tr>
  `).join('');
}

function renderBanter(rows, teams) {
  const leader = rows[0];
  const best = leader.codes.map(c => ({ code:c, goals:gf(teams[c]) })).sort((a,b)=>b.goals-a.goals)[0];
  byId('banter').innerHTML = `
    <div class="banter-item">${teamCell(best.code, teams)} is currently doing the heavy lifting for ${leader.name}.</div>
    <div class="banter-item">If your teams have not scored yet, stay calm. Panic is scheduled for the knockout rounds.</div>
    <div class="banter-item">All complaints about the draw remain formally ignored.</div>
  `;
}

function renderScores(matches, teams) {
  byId('scores').innerHTML = matches.slice().reverse().map(m => `
    <div class="score-row"><span>${teams[m.home]?.flag || ''} ${m.home} ${m.homeGoals} - ${m.awayGoals} ${m.away} ${teams[m.away]?.flag || ''}</span><strong>${m.status}</strong></div>
  `).join('');
}

function renderGroups(teams) {
  const groups = {};
  Object.entries(teams).forEach(([code,t]) => { (groups[t.group] ||= []).push({code, ...t, gd: gd(t)}); });
  byId('groups').innerHTML = Object.keys(groups).sort().map(g => {
    const rows = groups[g].sort((a,b)=> b.points-a.points || b.gd-a.gd || b.goalsFor-a.goalsFor || a.name.localeCompare(b.name));
    return `<div class="group-card"><h3>Group ${g}</h3><div class="table-wrap"><table><thead><tr><th>Team</th><th>Pts</th><th>GP</th><th>GF</th><th>GD</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.flag} ${r.code}</td><td>${r.points}</td><td>${r.played}</td><td>${r.goalsFor}</td><td>${r.gd}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
}

async function main() {
  const res = await fetch('data/results.json?cache=' + Date.now());
  const data = await res.json();
  const teams = data.teams;
  const rows = data.players.map(p => playerTotals(p, teams))
    .sort((a,b) => b.goals - a.goals || b.gd - a.gd || a.games - b.games || a.name.localeCompare(b.name));
  byId('lastUpdated').textContent = fmtDate(data.generatedAt);
  renderTopCards(rows, teams);
  renderGolden(rows, teams);
  renderAverage(data.players, teams);
  renderDraw(data.players, teams);
  renderBanter(rows, teams);
  renderScores(data.matches || [], teams);
  renderGroups(teams);
}

main().catch(err => {
  console.error(err);
  byId('lastUpdated').textContent = 'Error loading data';
});

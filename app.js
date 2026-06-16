const byId = (id) => document.getElementById(id);
const fmtDate = (iso) => {
  if (!iso) return 'Unknown';
  return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Pacific/Auckland' }).format(new Date(iso));
};
const points = (s) => (s.wins || 0) * 3 + (s.draws || 0);
const statFor = (results, team) => results.teams[team.name] || { goalsFor: 0, goalsAgainst: 0, goalDifference: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
const pill = (team) => `<span class="team-pill"><span>${team.flag}</span><span>${team.name}</span></span>`;
const rankLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);

function playerStats(player, results) {
  const teams = [player.tier1, player.tier2, player.tier3];
  const stats = teams.map(t => statFor(results, t));
  return {
    goals: stats.reduce((a, s) => a + (s.goalsFor || 0), 0),
    games: stats.reduce((a, s) => a + (s.gamesPlayed || 0), 0),
    gd: stats.reduce((a, s) => a + (s.goalDifference || 0), 0),
    teams
  };
}

function renderGoldenBoot(draw, results) {
  const rows = draw.players.map(p => ({ ...p, stats: playerStats(p, results) }))
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.gd - a.stats.gd || a.stats.games - b.stats.games || a.player.localeCompare(b.player));
  byId('goldenBootTable').querySelector('tbody').innerHTML = rows.map((p, i) => `
    <tr>
      <td class="rank">${rankLabel(i)}</td>
      <td class="player">${p.player}</td>
      <td>${p.stats.teams.map(pill).join('')}</td>
      <td class="num">${p.stats.goals}</td>
      <td class="num">${p.stats.games}</td>
      <td class="num">${p.stats.games ? (p.stats.goals / p.stats.games).toFixed(2) : '0.00'}</td>
    </tr>
  `).join('');
}

function renderAverage(draw, results) {
  const rows = draw.players.map(p => {
    const s = statFor(results, p.tier2);
    return { player: p.player, team: p.tier2, stats: s, points: points(s) };
  }).sort((a, b) => b.points - a.points || (b.stats.goalDifference || 0) - (a.stats.goalDifference || 0) || (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0) || a.player.localeCompare(b.player));
  byId('averageTable').querySelector('tbody').innerHTML = rows.map((r, i) => `
    <tr>
      <td class="rank">${rankLabel(i)}</td>
      <td class="player">${r.player}</td>
      <td>${pill(r.team)}</td>
      <td class="num">${r.points}</td>
      <td class="num">${r.stats.goalDifference || 0}</td>
      <td class="num">${r.stats.goalsFor || 0}</td>
      <td class="num">${r.stats.gamesPlayed || 0}</td>
    </tr>
  `).join('');
}

function renderDraw(draw, results, query = '') {
  const q = query.trim().toLowerCase();
  const rows = draw.players.filter(p => !q || [p.player, p.tier1.name, p.tier2.name, p.tier3.name].some(x => x.toLowerCase().includes(q)));
  byId('drawTable').querySelector('tbody').innerHTML = rows.map(p => {
    const s = playerStats(p, results);
    return `
      <tr>
        <td class="player">${p.player}</td>
        <td>${pill(p.tier1)}</td>
        <td>${pill(p.tier2)}</td>
        <td>${pill(p.tier3)}</td>
        <td class="num">${s.goals}</td>
        <td class="num">${s.games}</td>
      </tr>
    `;
  }).join('');
}

function renderTeams(draw, results) {
  const seen = new Map();
  draw.players.forEach(p => [p.tier1, p.tier2, p.tier3].forEach(t => seen.set(t.name, t)));
  const rows = [...seen.values()].map(t => ({ team: t, stats: statFor(results, t) }))
    .sort((a, b) => (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0) || a.team.name.localeCompare(b.team.name));
  byId('teamGrid').innerHTML = rows.map(({ team, stats }) => `
    <div class="team-card">
      <div><strong>${team.flag} ${team.name}</strong><span>${stats.gamesPlayed || 0} played · GD ${stats.goalDifference || 0}</span></div>
      <div class="num">${stats.goalsFor || 0}</div>
    </div>
  `).join('');
}

async function init() {
  const [draw, results] = await Promise.all([
    fetch('data/draw.json').then(r => r.json()),
    fetch('data/results.json?ts=' + Date.now()).then(r => r.json())
  ]);
  byId('lastUpdated').textContent = fmtDate(results.generatedAt);
  byId('matchCount').textContent = results.matches.length;
  byId('dataSource').textContent = results.sourceOk ? 'Automatic API' : 'Fallback data';
  renderGoldenBoot(draw, results);
  renderAverage(draw, results);
  renderDraw(draw, results);
  renderTeams(draw, results);
  byId('search').addEventListener('input', (e) => renderDraw(draw, results, e.target.value));
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin', `<div style="padding:16px;background:#5a1010;color:white">Could not load sweepstake data. Check data/draw.json and data/results.json.</div>`);
});

const byId = (id) => document.getElementById(id);
const fmtDate = (iso) => {
  if (!iso) return 'Unknown';
  return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Pacific/Auckland' }).format(new Date(iso));
};
const points = (s) => (s.wins || 0) * 3 + (s.draws || 0);
const statFor = (results, team) => results.teams[team.name] || { team: team.name, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
const pill = (team) => `<span class="team-pill" title="${team.name}"><span class="flag">${team.flag || flagFor(team.name)}</span><span class="team-code">${codeFor(team.name)}</span><span class="team-full">${team.name}</span></span>`;
const compactPill = (team) => `<span class="team-pill compact-only" title="${team.name}"><span class="flag">${team.flag || flagFor(team.name)}</span><span class="team-code">${codeFor(team.name)}</span></span>`;
const flagOnly = (team) => `<span class="flag-only" title="${team.name} (${codeFor(team.name)})"><span class="flag">${team.flag || flagFor(team.name)}</span></span>`;
const rankLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
const pct = (n) => `${Math.round(n * 100)}%`;

const groups = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia & Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', 'Côte d’Ivoire', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama']
};

const flagMap = {
  Argentina:'🇦🇷', Spain:'🇪🇸', France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal:'🇵🇹', Brazil:'🇧🇷', Morocco:'🇲🇦', Netherlands:'🇳🇱', Belgium:'🇧🇪', Germany:'🇩🇪', Croatia:'🇭🇷', Colombia:'🇨🇴',
  Mexico:'🇲🇽', Senegal:'🇸🇳', Uruguay:'🇺🇾', 'United States':'🇺🇸', Japan:'🇯🇵', Switzerland:'🇨🇭', Iran:'🇮🇷', Türkiye:'🇹🇷', Ecuador:'🇪🇨', Austria:'🇦🇹', 'South Korea':'🇰🇷', Australia:'🇦🇺', Algeria:'🇩🇿', Egypt:'🇪🇬', Canada:'🇨🇦', Norway:'🇳🇴', 'Côte d’Ivoire':'🇨🇮', Paraguay:'🇵🇾', Sweden:'🇸🇪', Czechia:'🇨🇿', Scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'DR Congo':'🇨🇩', Tunisia:'🇹🇳',
  Uzbekistan:'🇺🇿', Iraq:'🇮🇶', Qatar:'🇶🇦', 'South Africa':'🇿🇦', 'Saudi Arabia':'🇸🇦', Jordan:'🇯🇴', 'Bosnia & Herzegovina':'🇧🇦', 'Cape Verde':'🇨🇻', Ghana:'🇬🇭', Curaçao:'🇨🇼', Haiti:'🇭🇹', 'New Zealand':'🇳🇿'
};

const codeMap = {
  Argentina:'ARG', Spain:'ESP', France:'FRA', England:'ENG', Portugal:'POR', Brazil:'BRA', Morocco:'MAR', Netherlands:'NED', Belgium:'BEL', Germany:'GER', Croatia:'CRO', Colombia:'COL',
  Mexico:'MEX', Senegal:'SEN', Uruguay:'URU', 'United States':'USA', Japan:'JPN', Switzerland:'SUI', Iran:'IRN', Türkiye:'TUR', Ecuador:'ECU', Austria:'AUT', 'South Korea':'KOR', Australia:'AUS', Algeria:'ALG', Egypt:'EGY', Canada:'CAN', Norway:'NOR', 'Côte d’Ivoire':'CIV', Paraguay:'PAR', Sweden:'SWE', Czechia:'CZE', Scotland:'SCO', 'DR Congo':'DRC', Tunisia:'TUN',
  Uzbekistan:'UZB', Iraq:'IRQ', Qatar:'QAT', 'South Africa':'RSA', 'Saudi Arabia':'KSA', Jordan:'JOR', 'Bosnia & Herzegovina':'BIH', 'Cape Verde':'CPV', Ghana:'GHA', Curaçao:'CUW', Haiti:'HAI', 'New Zealand':'NZL'
};
const flagFor = (team) => flagMap[team] || '⚽';
const codeFor = (team) => codeMap[team] || team.slice(0,3).toUpperCase();

const flagSpan = (name, flag = flagFor(name)) => `<span class="flag" title="${name}">${flag}</span>`;
const teamNameWithFlag = (name, flag = flagFor(name)) => `${flagSpan(name, flag)} ${name}`;
const teamCompact = (name, flag = flagFor(name)) => `<span class="team-compact" title="${name}">${flagSpan(name, flag)} <span>${codeFor(name)}</span></span>`;
const groupForTeam = (team) => Object.entries(groups).find(([, teams]) => teams.includes(team))?.[0] || '—';

function playerStats(player, results) {
  const teams = [player.tier1, player.tier2, player.tier3];
  const stats = teams.map(t => statFor(results, t));
  const goals = stats.reduce((a, s) => a + (s.goalsFor || 0), 0);
  const games = stats.reduce((a, s) => a + (s.gamesPlayed || 0), 0);
  const gd = stats.reduce((a, s) => a + (s.goalDifference || 0), 0);
  const topTeam = teams.map((t, i) => ({ team: t, stats: stats[i] })).sort((a, b) => (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0))[0];
  return { goals, games, gd, teams, stats, topTeam };
}

function goldenRows(draw, results) {
  return draw.players.map(p => ({ ...p, stats: playerStats(p, results) }))
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.gd - a.stats.gd || a.stats.games - b.stats.games || a.player.localeCompare(b.player));
}

function averageRows(draw, results) {
  return draw.players.map(p => {
    const s = statFor(results, p.tier2);
    return { player: p.player, team: p.tier2, stats: s, points: points(s) };
  }).sort((a, b) => b.points - a.points || (b.stats.goalDifference || 0) - (a.stats.goalDifference || 0) || (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0) || a.player.localeCompare(b.player));
}

function renderSpotlight(draw, results) {
  const rows = goldenRows(draw, results);
  const leader = rows[0];
  const avgLeader = averageRows(draw, results)[0];
  byId('spotlight').innerHTML = `
    <div class="trophy-big">🏆</div>
    <div>
      <span class="label">Current Golden Boot leader</span>
      <h2>${leader.player}</h2>
      <p>${leader.stats.goals} goals from ${leader.stats.games} games. ${teamNameWithFlag(leader.stats.topTeam.team.name, leader.stats.topTeam.team.flag)} is doing the heavy lifting with ${leader.stats.topTeam.stats.goalsFor || 0}.</p>
    </div>
    <div class="spot-stat"><strong>${leader.stats.goals}</strong><span>goals</span></div>
    <div class="spot-stat"><strong>${flagSpan(avgLeader.team.name, avgLeader.team.flag)}</strong><span>${avgLeader.player}'s average team leads</span></div>
  `;
}

function renderMiniPanels(draw, results) {
  const rows = goldenRows(draw, results);
  const leader = rows[0];
  const spoon = [...rows].sort((a, b) => a.stats.goals - b.stats.goals || b.stats.games - a.stats.games || a.player.localeCompare(b.player))[0];
  const carrying = rows.map(p => {
    const top = p.stats.topTeam;
    const share = p.stats.goals ? (top.stats.goalsFor || 0) / p.stats.goals : 0;
    return { ...p, top, share };
  }).sort((a, b) => b.share - a.share || b.stats.goals - a.stats.goals)[0];

  byId('currentLeader').innerHTML = `<span class="label">🔥 Current leader</span><h3>${leader.player}</h3><p>${leader.stats.goals} goals · ${leader.stats.games} games</p>`;
  byId('woodenSpoon').innerHTML = `<span class="label">🥄 Wooden spoon watch</span><h3>${spoon.player}</h3><p>${spoon.stats.goals} goals so far. Thoughts and prayers.</p>`;
  byId('carryingJob').innerHTML = `<span class="label">💪 Carrying job</span><h3>${teamNameWithFlag(carrying.top.team.name, carrying.top.team.flag)}</h3><p>${carrying.top.stats.goalsFor || 0} of ${carrying.player}'s ${carrying.stats.goals} goals (${pct(carrying.share)}).</p>`;
}

function renderBanter(draw, results) {
  const rows = goldenRows(draw, results);
  const leader = rows[0];
  const avgLeader = averageRows(draw, results)[0];
  const bestGpg = [...rows].filter(r => r.stats.games > 0).sort((a, b) => (b.stats.goals / b.stats.games) - (a.stats.goals / a.stats.games))[0];
  const dormant = rows.filter(r => r.stats.games <= 1).sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const cards = [
    `🚀 ${leader.player} is currently acting like they personally invented attacking football.`,
    `🥈 ${avgLeader.player}'s ${flagSpan(avgLeader.team.name, avgLeader.team.flag)} ${avgLeader.team.name} is leading the Best Average Team race.`,
    `📈 Best goals-per-game ticket: ${bestGpg.player} with ${(bestGpg.stats.goals / bestGpg.stats.games).toFixed(2)} goals per game. Completely sustainable, obviously.`,
    `👀 ${dormant.player} has only had ${dormant.stats.games} team game${dormant.stats.games === 1 ? '' : 's'} counted. Dangerous lurker territory.`
  ];
  byId('banterGrid').innerHTML = cards.map(c => `<div class="banter-card">${c}</div>`).join('');
}

function renderGoldenBoot(draw, results) {
  const rows = goldenRows(draw, results);
  byId('goldenBootTable').querySelector('tbody').innerHTML = rows.map((p, i) => {
    const flags = p.stats.teams.map(t => `<span class="inline-flag" title="${t.name} (${codeFor(t.name)})">${t.flag || flagFor(t.name)}</span>`).join('');
    return `
      <tr>
        <td class="rank">${rankLabel(i)}</td>
        <td class="player"><span class="player-name">${p.player}</span><span class="inline-flags">${flags}</span></td>
        <td class="num goals">${p.stats.goals}</td>
        <td class="num games">${p.stats.games}</td>
      </tr>
    `;
  }).join('');
}

function renderAverage(draw, results) {
  const rows = averageRows(draw, results);
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
      <div><strong>${teamNameWithFlag(team.name, team.flag)}</strong><span>Group ${groupForTeam(team.name)} · ${stats.gamesPlayed || 0} played · GD ${stats.goalDifference || 0}</span></div>
      <div class="num">${stats.goalsFor || 0}</div>
    </div>
  `).join('');
}

function standingsForGroup(letter, results) {
  return groups[letter].map(name => {
    const s = results.teams[name] || { team: name, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
    return { name, flag: flagFor(name), stats: s, points: points(s) };
  }).sort((a, b) => b.points - a.points || (b.stats.goalDifference || 0) - (a.stats.goalDifference || 0) || (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0) || a.name.localeCompare(b.name));
}

function renderGroups(results) {
  byId('groupGrid').innerHTML = Object.keys(groups).map(letter => `
    <article class="group-card">
      <h3>Group ${letter}</h3>
      <table>
        <thead><tr><th>Team</th><th>Pts</th><th>GP</th><th>GD</th><th>GF</th></tr></thead>
        <tbody>
          ${standingsForGroup(letter, results).map(t => `
            <tr>
              <td>${teamCompact(t.name, t.flag)}</td>
              <td class="num">${t.points}</td>
              <td class="num">${t.stats.gamesPlayed || 0}</td>
              <td class="num">${t.stats.goalDifference || 0}</td>
              <td class="num">${t.stats.goalsFor || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </article>
  `).join('');
}

function renderScores(results) {
  const matches = [...(results.matches || [])].sort((a, b) => {
    if (!a.utcDate && !b.utcDate) return String(a.id).localeCompare(String(b.id));
    if (!a.utcDate) return 1;
    if (!b.utcDate) return -1;
    return new Date(a.utcDate) - new Date(b.utcDate);
  });
  byId('scoresList').innerHTML = matches.map(m => {
    const g = m.group || groupForTeam(m.homeTeam);
    return `<div class="score-card">
      <span class="score-group">Group ${g}</span>
      <strong>${teamCompact(m.homeTeam)}</strong>
      <span class="scoreline">${m.homeGoals} – ${m.awayGoals}</span>
      <strong>${teamCompact(m.awayTeam)}</strong>
    </div>`;
  }).join('');
}

async function init() {
  const [draw, results] = await Promise.all([
    fetch('data/draw.json').then(r => r.json()),
    fetch('data/results.json?ts=' + Date.now()).then(r => r.json())
  ]);
  byId('lastUpdated').textContent = fmtDate(results.generatedAt);
  byId('matchCount').textContent = results.matches.length;
  byId('dataSource').textContent = results.sourceOk ? 'Automatic API' : 'Fallback data';
  renderSpotlight(draw, results);
  renderMiniPanels(draw, results);
  renderBanter(draw, results);
  renderGoldenBoot(draw, results);
  renderAverage(draw, results);
  renderDraw(draw, results);
  renderGroups(results);
  renderScores(results);
  renderTeams(draw, results);
  byId('search').addEventListener('input', (e) => renderDraw(draw, results, e.target.value));
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin', `<div style="padding:16px;background:#5a1010;color:white">Could not load sweepstake data. Check data/draw.json and data/results.json.</div>`);
});

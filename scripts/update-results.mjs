import fs from 'node:fs/promises';

const API_URL = process.env.WORLDCUP_API_URL || 'https://worldcup26.ir/get/games';
const OUT = new URL('../data/results.json', import.meta.url);

const teamAliases = {
  'Czech Republic': 'Czechia',
  'CZ Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'Turkiye': 'Türkiye',
  'Ivory Coast': 'Côte d’Ivoire',
  'Cote dIvoire': 'Côte d’Ivoire',
  'Cote d’Ivoire': 'Côte d’Ivoire',
  'Côte dIvoire': 'Côte d’Ivoire',
  'Congo DR': 'DR Congo',
  'Congo, DR': 'DR Congo',
  'DR Congo': 'DR Congo',
  'CD Congo DR': 'DR Congo',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia & Herzegovina',
  'United States': 'United States',
  'USA': 'United States',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
  'Curacao': 'Curaçao',
  'Curaçao': 'Curaçao',
  'Saudi Arabia': 'Saudi Arabia',
  'Cape Verde': 'Cape Verde',
  'New Zealand': 'New Zealand',
  'South Africa': 'South Africa'
};


const groupLookup = {
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
function groupForTeam(team) {
  return Object.entries(groupLookup).find(([, teams]) => teams.includes(team))?.[0] || null;
}
function groupForMatch(homeTeam, awayTeam) {
  const homeGroup = groupForTeam(homeTeam);
  const awayGroup = groupForTeam(awayTeam);
  return homeGroup && homeGroup === awayGroup ? homeGroup : (homeGroup || awayGroup);
}

const codeToName = {
  ARG:'Argentina', ESP:'Spain', FRA:'France', ENG:'England', POR:'Portugal', BRA:'Brazil', MAR:'Morocco', NED:'Netherlands', BEL:'Belgium', GER:'Germany', CRO:'Croatia', COL:'Colombia',
  MEX:'Mexico', SEN:'Senegal', URU:'Uruguay', USA:'United States', JPN:'Japan', SUI:'Switzerland', IRI:'Iran', TUR:'Türkiye', ECU:'Ecuador', AUT:'Austria', KOR:'South Korea', AUS:'Australia', DZA:'Algeria', EGY:'Egypt', CAN:'Canada', NOR:'Norway', CIV:'Côte d’Ivoire', PAR:'Paraguay', SWE:'Sweden', CZE:'Czechia', SCO:'Scotland', COD:'DR Congo', TUN:'Tunisia',
  UZB:'Uzbekistan', IRQ:'Iraq', QAT:'Qatar', RSA:'South Africa', KSA:'Saudi Arabia', JOR:'Jordan', BIH:'Bosnia & Herzegovina', CPV:'Cape Verde', GHA:'Ghana', CUW:'Curaçao', HTI:'Haiti', NZL:'New Zealand'
};

function normaliseName(value) {
  if (!value) return null;
  let s = String(value).trim();
  s = s.replace(/\s+/g, ' ');
  if (codeToName[s.toUpperCase()]) return codeToName[s.toUpperCase()];
  return teamAliases[s] || s;
}

function getFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function getTeamName(side) {
  if (!side) return null;
  if (typeof side === 'string') return normaliseName(side);
  return normaliseName(getFirst(side, ['name_en','name','team','country','code','shortName','tla']));
}

function parseMatch(m) {
  const homeTeam = getTeamName(getFirst(m, ['homeTeam','home','team1','home_team','homeTeamName'])) || normaliseName(getFirst(m, ['home_team_en','home_name','homeTeamName','homeTeamCode','homeCode']));
  const awayTeam = getTeamName(getFirst(m, ['awayTeam','away','team2','away_team','awayTeamName'])) || normaliseName(getFirst(m, ['away_team_en','away_name','awayTeamName','awayTeamCode','awayCode']));

  const scoreObj = getFirst(m, ['score','scores','result']) || {};
  const full = scoreObj.fullTime || scoreObj.fulltime || scoreObj.ft || scoreObj.regularTime || scoreObj;
  const homeGoals = Number(getFirst(full, ['home','homeTeam','home_score','homeScore','team1','score1','homeGoals']) ?? getFirst(m, ['homeScore','home_score','score_home','home_goals','team1_score']));
  const awayGoals = Number(getFirst(full, ['away','awayTeam','away_score','awayScore','team2','score2','awayGoals']) ?? getFirst(m, ['awayScore','away_score','score_away','away_goals','team2_score']));

  const rawStatus = String(getFirst(m, ['status','matchStatus','state']) || '').toLowerCase();
  const finished = ['finished','complete','completed','ft','full_time','full-time'].some(x => rawStatus.includes(x)) || (Number.isFinite(homeGoals) && Number.isFinite(awayGoals) && rawStatus !== 'scheduled');

  if (!homeTeam || !awayTeam || !finished || !Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null;
  return {
    id: String(getFirst(m, ['id','game_id','match_id','fixture_id']) || `${homeTeam}-${awayTeam}`),
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    status: 'FINISHED',
    utcDate: getFirst(m, ['utcDate','date','datetime','start_time','kickoff']) || null,
    group: getFirst(m, ['group','stage','matchday']) || groupForMatch(homeTeam, awayTeam)
  };
}

const fallbackMatches = [
  ['Mexico','South Africa',2,0], ['South Korea','Czechia',2,1], ['Canada','Bosnia & Herzegovina',1,1],
  ['United States','Paraguay',4,1], ['Qatar','Switzerland',1,1], ['Brazil','Morocco',1,1],
  ['Haiti','Scotland',0,1], ['Australia','Türkiye',2,0], ['Germany','Curaçao',7,1],
  ['Netherlands','Japan',2,2], ['Côte d’Ivoire','Ecuador',1,0], ['Sweden','Tunisia',5,1],
  ['Spain','Cape Verde',0,0], ['Belgium','Egypt',1,1]
].map(([homeTeam, awayTeam, homeGoals, awayGoals], i) => ({ id: `fallback-${i+1}`, homeTeam, awayTeam, homeGoals, awayGoals, status:'FINISHED', utcDate:null, group: groupForMatch(homeTeam, awayTeam) }));

async function main() {
  let matches = [];
  let source = API_URL;
  let sourceOk = false;
  try {
    const res = await fetch(API_URL, { headers: { 'accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw = Array.isArray(json) ? json : (json.data || json.games || json.matches || json.results || []);
    matches = raw.map(parseMatch).filter(Boolean);
    sourceOk = matches.length > 0;
  } catch (err) {
    console.error(`Could not fetch ${API_URL}: ${err.message}`);
  }

  if (!sourceOk) {
    matches = fallbackMatches;
    source = 'fallback-in-repo';
  }

  const teams = {};
  for (const m of matches) {
    for (const team of [m.homeTeam, m.awayTeam]) {
      teams[team] ||= { team, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
    }
    teams[m.homeTeam].goalsFor += m.homeGoals;
    teams[m.homeTeam].goalsAgainst += m.awayGoals;
    teams[m.homeTeam].gamesPlayed += 1;
    teams[m.awayTeam].goalsFor += m.awayGoals;
    teams[m.awayTeam].goalsAgainst += m.homeGoals;
    teams[m.awayTeam].gamesPlayed += 1;
    if (m.homeGoals > m.awayGoals) { teams[m.homeTeam].wins++; teams[m.awayTeam].losses++; }
    else if (m.homeGoals < m.awayGoals) { teams[m.awayTeam].wins++; teams[m.homeTeam].losses++; }
    else { teams[m.homeTeam].draws++; teams[m.awayTeam].draws++; }
  }
  for (const t of Object.values(teams)) t.goalDifference = t.goalsFor - t.goalsAgainst;

  const output = {
    generatedAt: new Date().toISOString(),
    source,
    sourceOk,
    matches,
    teams
  };
  await fs.writeFile(OUT, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${matches.length} completed matches to data/results.json from ${source}`);
}

main().catch(err => { console.error(err); process.exit(1); });

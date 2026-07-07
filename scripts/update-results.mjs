import fs from 'node:fs/promises';
import { generateBanter } from './generate-banter.mjs';

const API_URL = process.env.WORLDCUP_API_URL || 'https://worldcup26.ir/get/games';
const OUT = new URL('../data/results.json', import.meta.url);

const englandFlag = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
const scotlandFlag = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';

const codeToName = {
  ARG:'Argentina', ESP:'Spain', FRA:'France', ENG:'England', POR:'Portugal', BRA:'Brazil', MAR:'Morocco', NED:'Netherlands', BEL:'Belgium', GER:'Germany', CRO:'Croatia', COL:'Colombia',
  MEX:'Mexico', SEN:'Senegal', URU:'Uruguay', USA:'United States', JPN:'Japan', SUI:'Switzerland', IRN:'Iran', IRI:'Iran', TUR:'Türkiye', ECU:'Ecuador', AUT:'Austria', KOR:'South Korea', AUS:'Australia', DZA:'Algeria', EGY:'Egypt', CAN:'Canada', NOR:'Norway', CIV:'Côte d’Ivoire', PAR:'Paraguay', SWE:'Sweden', CZE:'Czechia', SCO:'Scotland', COD:'DR Congo', TUN:'Tunisia',
  UZB:'Uzbekistan', IRQ:'Iraq', QAT:'Qatar', RSA:'South Africa', KSA:'Saudi Arabia', JOR:'Jordan', BIH:'Bosnia & Herzegovina', CPV:'Cape Verde', GHA:'Ghana', CUW:'Curaçao', HTI:'Haiti', NZL:'New Zealand', PAN:'Panama'
};

const defaultFlags = {
  ARG:'🇦🇷', ESP:'🇪🇸', FRA:'🇫🇷', ENG: englandFlag, POR:'🇵🇹', BRA:'🇧🇷', MAR:'🇲🇦', NED:'🇳🇱', BEL:'🇧🇪', GER:'🇩🇪', CRO:'🇭🇷', COL:'🇨🇴',
  MEX:'🇲🇽', SEN:'🇸🇳', URU:'🇺🇾', USA:'🇺🇸', JPN:'🇯🇵', SUI:'🇨🇭', IRN:'🇮🇷', TUR:'🇹🇷', ECU:'🇪🇨', AUT:'🇦🇹', KOR:'🇰🇷', AUS:'🇦🇺', DZA:'🇩🇿', EGY:'🇪🇬', CAN:'🇨🇦', NOR:'🇳🇴', CIV:'🇨🇮', PAR:'🇵🇾', SWE:'🇸🇪', CZE:'🇨🇿', SCO: scotlandFlag, COD:'🇨🇩', TUN:'🇹🇳',
  UZB:'🇺🇿', IRQ:'🇮🇶', QAT:'🇶🇦', RSA:'🇿🇦', KSA:'🇸🇦', JOR:'🇯🇴', BIH:'🇧🇦', CPV:'🇨🇻', GHA:'🇬🇭', CUW:'🇨🇼', HTI:'🇭🇹', NZL:'🇳🇿', PAN:'🇵🇦'
};

const nameToCode = Object.fromEntries(Object.entries(codeToName).map(([c, n]) => [n, c === 'IRI' ? 'IRN' : c]));
Object.assign(nameToCode, {
  'Czech Republic': 'CZE',
  'CZ Czech Republic': 'CZE',
  'Turkey': 'TUR',
  'Turkiye': 'TUR',
  'Türkiye': 'TUR',
  'Ivory Coast': 'CIV',
  'Cote dIvoire': 'CIV',
  'Cote d’Ivoire': 'CIV',
  'Côte dIvoire': 'CIV',
  'Côte d’Ivoire': 'CIV',
  'Congo DR': 'COD',
  'Congo, DR': 'COD',
  'DR Congo': 'COD',
  'CD Congo DR': 'COD',
  'Democratic Republic of the Congo': 'COD',
  'Bosnia and Herzegovina': 'BIH',
  'Bosnia & Herzegovina': 'BIH',
  'USA': 'USA',
  'United States': 'USA',
  'Korea Republic': 'KOR',
  'South Korea': 'KOR',
  'Curacao': 'CUW',
  'Curaçao': 'CUW',
  'Iran': 'IRN',
  'IRI': 'IRN',
  'Panama': 'PAN'
});

const groups = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HTI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'DZA', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN']
};
const codeToGroup = Object.fromEntries(Object.entries(groups).flatMap(([g, codes]) => codes.map(c => [c, g])));

function getFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function cleanName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

function asCode(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    return asCode(getFirst(value, ['fifa_code', 'code', 'tla', 'shortName', 'name_en', 'name', 'team', 'country']));
  }
  const s = cleanName(value);
  const upper = s.toUpperCase();
  if (codeToName[upper]) return upper === 'IRI' ? 'IRN' : upper;
  return nameToCode[s] || null;
}

function scoreNumber(value) {
  if (value === undefined || value === null || value === '' || value === 'null') return NaN;
  return Number(value);
}

function isTrueLike(value) {
  return ['true', '1', 'yes', 'y'].includes(String(value).trim().toLowerCase());
}

function parseMatch(m) {
  const home = asCode(getFirst(m, [
    'homeTeam', 'home', 'team1', 'home_team', 'homeTeamName',
    'home_team_name_en', 'home_team_en', 'home_name', 'homeTeamCode', 'homeCode', 'home_team_code'
  ]));
  const away = asCode(getFirst(m, [
    'awayTeam', 'away', 'team2', 'away_team', 'awayTeamName',
    'away_team_name_en', 'away_team_en', 'away_name', 'awayTeamCode', 'awayCode', 'away_team_code'
  ]));

  const scoreObj = getFirst(m, ['score', 'scores', 'result']) || {};
  const full = scoreObj.fullTime || scoreObj.fulltime || scoreObj.ft || scoreObj.regularTime || scoreObj;
  const homeGoals = scoreNumber(
    getFirst(full, ['home', 'homeTeam', 'home_score', 'homeScore', 'team1', 'score1', 'homeGoals']) ??
    getFirst(m, ['home_score', 'homeScore', 'score_home', 'home_goals', 'team1_score'])
  );
  const awayGoals = scoreNumber(
    getFirst(full, ['away', 'awayTeam', 'away_score', 'awayScore', 'team2', 'score2', 'awayGoals']) ??
    getFirst(m, ['away_score', 'awayScore', 'score_away', 'away_goals', 'team2_score'])
  );

  const rawStatus = String(getFirst(m, ['status', 'matchStatus', 'state', 'time_elapsed']) || '').toLowerCase();
  const finishedFlag = getFirst(m, ['finished', 'isFinished', 'complete', 'completed']);
  const finished = isTrueLike(finishedFlag) || ['finished', 'complete', 'completed', 'ft', 'full_time', 'full-time', 'ended'].some(x => rawStatus.includes(x));

  if (!home || !away || !finished || !Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null;

  return {
    id: String(getFirst(m, ['id', '_id', 'game_id', 'match_id', 'fixture_id']) || `${home}-${away}`),
    date: getFirst(m, ['utcDate', 'date', 'datetime', 'start_time', 'kickoff', 'local_date']) || null,
    group: getFirst(m, ['group']) || codeToGroup[home] || codeToGroup[away] || null,
    home,
    away,
    homeGoals,
    awayGoals,
    status: 'FT'
  };
}

const fallbackMatches = [
  ['MEX','RSA',2,0,'A','2026-06-11'], ['KOR','CZE',2,1,'A','2026-06-11'],
  ['CAN','BIH',1,1,'B','2026-06-12'], ['USA','PAR',4,1,'D','2026-06-12'],
  ['QAT','SUI',1,1,'B','2026-06-13'], ['BRA','MAR',1,1,'C','2026-06-13'], ['HTI','SCO',0,1,'C','2026-06-13'],
  ['AUS','TUR',2,0,'D','2026-06-14'], ['GER','CUW',7,1,'E','2026-06-14'], ['NED','JPN',2,2,'F','2026-06-14'], ['CIV','ECU',1,0,'E','2026-06-14'], ['SWE','TUN',5,1,'F','2026-06-14'],
  ['ESP','CPV',0,0,'H','2026-06-15'], ['BEL','EGY',1,1,'G','2026-06-15'], ['KSA','URU',1,1,'H','2026-06-15'], ['IRN','NZL',2,2,'G','2026-06-15']
].map(([home, away, homeGoals, awayGoals, group, date], i) => ({ id: `fallback-${i + 1}`, date, group, home, away, homeGoals, awayGoals, status: 'FT' }));

function mergeMatches(apiMatches) {
  const byKey = new Map();
  for (const m of fallbackMatches) byKey.set(`${m.home}-${m.away}`, m);
  for (const m of apiMatches) byKey.set(`${m.home}-${m.away}`, m);
  return [...byKey.values()].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
}

function emptyTeam(code, existing) {
  return {
    name: existing?.name || codeToName[code] || code,
    flag: (code === 'ENG' || code === 'SCO') ? defaultFlags[code] : (existing?.flag || defaultFlags[code] || ''),
    goalsFor: 0,
    goalsAgainst: 0,
    played: 0,
    points: 0,
    group: existing?.group || codeToGroup[code] || null
  };
}

function buildTeams(existingTeams, matches) {
  const teams = {};
  for (const code of Object.keys(existingTeams || {})) teams[code] = emptyTeam(code, existingTeams[code]);
  for (const code of Object.keys(codeToName)) if (code !== 'IRI') teams[code] ||= emptyTeam(code, null);

  for (const m of matches) {
    teams[m.home] ||= emptyTeam(m.home, null);
    teams[m.away] ||= emptyTeam(m.away, null);
    teams[m.home].goalsFor += m.homeGoals;
    teams[m.home].goalsAgainst += m.awayGoals;
    teams[m.home].played += 1;
    teams[m.away].goalsFor += m.awayGoals;
    teams[m.away].goalsAgainst += m.homeGoals;
    teams[m.away].played += 1;
    if (m.homeGoals > m.awayGoals) teams[m.home].points += 3;
    else if (m.homeGoals < m.awayGoals) teams[m.away].points += 3;
    else { teams[m.home].points += 1; teams[m.away].points += 1; }
  }
  return teams;
}

async function fetchApiMatches() {
  const res = await fetch(API_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json) ? json : (json.data || json.games || json.matches || json.results || []);
  if (!Array.isArray(raw)) throw new Error('API response did not contain an array of games');
  const parsed = raw.map(parseMatch).filter(Boolean);
  if (!parsed.length) throw new Error(`No completed matches parsed from ${raw.length} API games`);
  return parsed;
}

async function main() {
  const current = JSON.parse(await fs.readFile(OUT, 'utf8'));
  let source = API_URL;
  let sourceOk = false;
  let sourceError = null;
  let apiMatches = [];

  try {
    apiMatches = await fetchApiMatches();
    sourceOk = apiMatches.length > 0;
    console.log(`Parsed ${apiMatches.length} finished matches from API.`);
  } catch (err) {
    sourceError = err.message;
    source = current.source || 'last-good-results';
    console.error(`Could not fetch/parse ${API_URL}: ${err.message}`);
  }

  if (!sourceOk) {
    const output = {
      ...current,
      generatedAt: new Date().toISOString(),
      sourceOk: false,
      sourceError,
      source
    };
    await fs.writeFile(OUT, JSON.stringify(output, null, 2) + '\n');
    console.log(`API unavailable. Preserved ${Array.isArray(output.matches) ? output.matches.length : 0} existing matches and existing teams.`);
    return;
  }

  const matches = mergeMatches(apiMatches);
  const updatedTeams = buildTeams(current.teams || {}, matches);
  const generatedAt = new Date().toISOString();

  const output = {
    ...current,
    generatedAt,
    source,
    sourceOk: true,
    sourceError: null,
    teams: updatedTeams,
    matches,
    banter: generateBanter(current.players || [], updatedTeams, new Date(generatedAt))
  };

  await fs.writeFile(OUT, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${matches.length} completed matches to data/results.json from ${source}. Players preserved: ${Array.isArray(output.players) ? output.players.length : 0}`);
}

main().catch(err => { console.error(err); process.exit(1); });

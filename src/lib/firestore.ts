import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Tournament, Match, Standing, MatchEvent, Team } from "@/types";

export async function uploadTeamLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  formData.append("folder", "team-logos");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url as string;
}

// Tournaments
export async function getTournaments(sport?: string): Promise<Tournament[]> {
  const ref = collection(db, "tournaments");
  const q = sport ? query(ref, where("sport", "==", sport)) : query(ref);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Tournament))
    .sort((a, b) => {
      const da = a.startDate ?? String(a.year);
      const db2 = b.startDate ?? String(b.year);
      return db2.localeCompare(da);
    });
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, "tournaments", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Tournament;
}

export async function addTournament(data: Omit<Tournament, "id">) {
  return addDoc(collection(db, "tournaments"), data);
}

// Teams
export function subscribeTeams(
  tournamentId: string,
  callback: (teams: Team[]) => void
): Unsubscribe {
  const q = query(collection(db, "tournaments", tournamentId, "teams"));
  return onSnapshot(q, (snap) => {
    const teams = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Team))
      .sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.name.localeCompare(b.name));
    callback(teams);
  });
}

export async function getTeams(tournamentId: string): Promise<Team[]> {
  const snap = await getDocs(collection(db, "tournaments", tournamentId, "teams"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export function buildLogoMap(teams: Team[]): Record<string, string> {
  return Object.fromEntries(teams.filter((t) => t.logoUrl).map((t) => [t.name, t.logoUrl!]));
}

export async function addTeam(tournamentId: string, data: Omit<Team, "id">) {
  const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  return addDoc(collection(db, "tournaments", tournamentId, "teams"), cleaned);
}

export async function deleteTeam(tournamentId: string, teamId: string) {
  return deleteDoc(doc(db, "tournaments", tournamentId, "teams", teamId));
}

// Matches
export function subscribeMatches(
  tournamentId: string,
  callback: (matches: Match[]) => void
): Unsubscribe {
  const q = query(collection(db, "matches"), where("tournamentId", "==", tournamentId));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Match))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    callback(matches);
  });
}

export async function getMatch(id: string): Promise<Match | null> {
  const snap = await getDoc(doc(db, "matches", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Match;
}

export function subscribeMatch(
  id: string,
  callback: (match: Match | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "matches", id), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null);
  });
}

export async function recalculateMatchScore(matchId: string): Promise<void> {
  const eventsSnap = await getDocs(collection(db, "matches", matchId, "events"));
  let score1 = 0, score2 = 0;
  for (const d of eventsSnap.docs) {
    const ev = d.data() as MatchEvent;
    if (ev.type === "goal" || ev.type === "penalty_goal") {
      ev.team === "team1" ? score1++ : score2++;
    } else if (ev.type === "own_goal") {
      ev.team === "team1" ? score2++ : score1++;
    }
  }
  await updateDoc(doc(db, "matches", matchId), { score1, score2 });
}

export async function addMatch(data: Omit<Match, "id">) {
  const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  return addDoc(collection(db, "matches"), cleaned);
}

export async function updateMatch(id: string, data: Partial<Match>) {
  return updateDoc(doc(db, "matches", id), data);
}

export async function deleteMatch(id: string) {
  return deleteDoc(doc(db, "matches", id));
}

// Match Events
export function subscribeEvents(
  matchId: string,
  callback: (events: MatchEvent[]) => void
): Unsubscribe {
  const q = query(collection(db, "matches", matchId, "events"));
  return onSnapshot(q, (snap) => {
    const parseMin = (m: string) => { const [base, extra] = String(m).split("+"); return Number(base) + (extra ? Number(extra) / 100 : 0); };
    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as MatchEvent))
      .sort((a, b) => parseMin(a.minute) - parseMin(b.minute) || a.createdAt - b.createdAt);
    callback(events);
  });
}

export async function addEvent(matchId: string, data: Omit<MatchEvent, "id">) {
  return addDoc(collection(db, "matches", matchId, "events"), data);
}

export async function deleteEvent(matchId: string, eventId: string) {
  await deleteDoc(doc(db, "matches", matchId, "events", eventId));
}

// Standings
export function subscribeStandings(
  tournamentId: string,
  callback: (standings: Standing[]) => void
): Unsubscribe {
  const q = query(collection(db, "standings"), where("tournamentId", "==", tournamentId));
  return onSnapshot(q, (snap) => {
    const standings = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Standing))
      .sort((a, b) =>
        a.group.localeCompare(b.group) ||
        b.points - a.points ||
        b.gf - a.gf
      );
    callback(standings);
  });
}

// Top stats (scorers, yellow/red cards) from events across all matches
export interface PlayerStat {
  player: string;
  team: string;
  jerseyNumber?: number;
  count: number;
}

export async function getTournamentTopStats(tournamentId: string): Promise<{
  topScorers: PlayerStat[];
  topYellows: PlayerStat[];
  topReds: PlayerStat[];
}> {
  const matchesSnap = await getDocs(
    query(collection(db, "matches"), where("tournamentId", "==", tournamentId))
  );
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

  const eventSnaps = await Promise.all(
    matches.map((m) =>
      getDocs(collection(db, "matches", m.id, "events")).then((snap) => ({ match: m, snap }))
    )
  );

  const goals: Record<string, PlayerStat> = {};
  const yellows: Record<string, PlayerStat> = {};
  const reds: Record<string, PlayerStat> = {};

  function mergePlayer(map: Record<string, PlayerStat>, ev: MatchEvent, teamName: string) {
    // Key by jerseyNumber+team if available, else by player text+team
    const key = ev.jerseyNumber ? `#${ev.jerseyNumber}__${teamName}` : `${ev.player}__${teamName}`;
    if (!map[key]) {
      map[key] = { player: ev.player, team: teamName, jerseyNumber: ev.jerseyNumber, count: 0 };
    } else {
      // Prefer the entry that has both name and jersey number
      const existing = map[key];
      const existingIsNumberOnly = !isNaN(Number(existing.player));
      const newHasName = isNaN(Number(ev.player));
      if (existingIsNumberOnly && newHasName) {
        existing.player = ev.player;
        if (ev.jerseyNumber) existing.jerseyNumber = ev.jerseyNumber;
      }
    }
    map[key].count++;
  }

  for (const { match, snap } of eventSnaps) {
    for (const d of snap.docs) {
      const ev = d.data() as MatchEvent;
      const teamName = ev.team === "team1" ? match.team1 : match.team2;

      if (ev.type === "goal" || ev.type === "penalty_goal") mergePlayer(goals, ev, teamName);
      if (ev.type === "yellow_card" && !ev.isStaff) mergePlayer(yellows, ev, teamName);
      if (ev.type === "red_card" && !ev.isStaff) mergePlayer(reds, ev, teamName);
    }
  }

  const top3 = (map: Record<string, PlayerStat>) =>
    Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);

  return { topScorers: top3(goals), topYellows: top3(yellows), topReds: top3(reds) };
}

// Recalculate all standings for a tournament from match results
export async function recalculateStandings(tournamentId: string): Promise<void> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) return;

  const { winPoints, drawPoints, lossPoints, penaltyWinPoints, penaltyLossPoints } = tournament;

  // Get all teams and matches in parallel
  const [teamsSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, "tournaments", tournamentId, "teams")),
    getDocs(query(collection(db, "matches"), where("tournamentId", "==", tournamentId))),
  ]);
  const allTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

  // Build standings map: group -> team -> standing
  const map: Record<string, Record<string, Omit<Standing, "id">>> = {};

  function ensureTeam(group: string, team: string) {
    if (!map[group]) map[group] = {};
    if (!map[group][team]) {
      map[group][team] = {
        tournamentId, group, team,
        played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, points: 0,
      };
    }
    return map[group][team];
  }

  // Pre-populate all teams (shows in standings even before playing)
  for (const t of allTeams) {
    if (t.group) ensureTeam(t.group, t.name);
  }

  for (const m of matches) {
    if (m.stage === "knockout") continue;
    // include live matches (treat as normal result) and full_time with resultType
    if (m.status !== "live" && m.status !== "full_time") continue;
    if (m.status === "full_time" && !m.resultType && tournament.sport !== "volleyball") continue;
    const group = m.group || "ทั่วไป";
    const s1 = ensureTeam(group, m.team1);
    const s2 = ensureTeam(group, m.team2);

    s1.played++;
    s2.played++;
    s1.gf += m.score1;
    s1.ga += m.score2;
    s2.gf += m.score2;
    s2.ga += m.score1;

    if (tournament.sport === "volleyball") {
      // 2-0 → winPoints/lossPoints, 2-1 → penaltyWinPoints/penaltyLossPoints
      const isClose = Math.abs(m.score1 - m.score2) === 1;
      if (m.score1 > m.score2) {
        s1.win++; s1.points += isClose ? penaltyWinPoints : winPoints;
        s2.loss++; s2.points += isClose ? penaltyLossPoints : lossPoints;
      } else if (m.score2 > m.score1) {
        s2.win++; s2.points += isClose ? penaltyWinPoints : winPoints;
        s1.loss++; s1.points += isClose ? penaltyLossPoints : lossPoints;
      }
    } else if (m.resultType === "penalty" && m.status === "full_time") {
      const pen1 = m.penalty1 ?? 0;
      const pen2 = m.penalty2 ?? 0;
      if (pen1 > pen2) {
        s1.win++; s1.points += penaltyWinPoints;
        s2.loss++; s2.points += penaltyLossPoints;
      } else {
        s2.win++; s2.points += penaltyWinPoints;
        s1.loss++; s1.points += penaltyLossPoints;
      }
    } else {
      if (m.score1 > m.score2) {
        s1.win++; s1.points += winPoints;
        s2.loss++; s2.points += lossPoints;
      } else if (m.score2 > m.score1) {
        s2.win++; s2.points += winPoints;
        s1.loss++; s1.points += lossPoints;
      } else {
        s1.draw++; s1.points += drawPoints;
        s2.draw++; s2.points += drawPoints;
      }
    }
  }

  // Collect new standing IDs
  const newIds = new Set<string>();
  const writes: Promise<unknown>[] = [];
  for (const groupStandings of Object.values(map)) {
    for (const standing of Object.values(groupStandings)) {
      const docId = `${tournamentId}_${standing.group}_${standing.team}`.replace(/[\s/]/g, "_");
      newIds.add(docId);
      writes.push(setDoc(doc(db, "standings", docId), standing));
    }
  }

  // Delete standings that no longer exist in the new map
  const existingSnap = await getDocs(
    query(collection(db, "standings"), where("tournamentId", "==", tournamentId))
  );
  const deletes = existingSnap.docs
    .filter((d) => !newIds.has(d.id))
    .map((d) => deleteDoc(d.ref));

  await Promise.all([...writes, ...deletes]);
}

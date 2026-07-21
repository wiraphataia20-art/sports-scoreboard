export type SportType = "football" | "basketball" | "volleyball" | "futsal";

export interface SetScore { s1: number; s2: number; }
export interface QuarterScore { s1: number; s2: number; }

export type MatchStatus = "upcoming" | "live" | "full_time";

export type ScheduleStatus = "scheduled" | "postponed" | "rescheduled";

export type EventType = "goal" | "penalty_goal" | "penalty_miss" | "own_goal" | "yellow_card" | "red_card" | "substitution";

export type ResultType = "normal" | "penalty";

export type MatchStage = "group" | "knockout";

export interface Tournament {
  id: string;
  name: string;
  sport: SportType;
  year: number;
  startDate?: string;
  eventName?: string;
  gender?: "ชาย" | "หญิง";
  halfDuration?: number;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  penaltyWinPoints: number;
  penaltyLossPoints: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  sport: SportType;
  team1: string;
  team1Full?: string;
  team2: string;
  team2Full?: string;
  score1: number;
  score2: number;
  penalty1?: number;
  penalty2?: number;
  status: MatchStatus;
  resultType?: ResultType;
  stage?: MatchStage;
  group?: string;
  date: string;
  time: string;
  scheduleStatus?: ScheduleStatus;
  originalDate?: string;
  originalTime?: string;
  scheduleNote?: string;
  scheduleUpdatedAt?: number;
  field: string;
  round: string;
  // Timer
  halfDuration?: number;
  timerElapsed?: number;
  timerStartedAt?: number | null;
  timerPhase?: "1st" | "1st_extra" | "2nd" | "2nd_extra";
  extraTimeStartedAt?: number | null;
  extraTimeElapsed?: number;
  // Volleyball sets
  sets?: SetScore[];
  // Basketball quarters
  quarters?: QuarterScore[];
  // Match Stats
  shots1?: number;
  shots2?: number;
  onTarget1?: number;
  onTarget2?: number;
  corners1?: number;
  corners2?: number;
  fouls1?: number;
  fouls2?: number;
  offsides1?: number;
  offsides2?: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  nameFull?: string;
  group?: string;
  logoUrl?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: EventType;
  team: "team1" | "team2";
  player: string;
  jerseyNumber?: number;
  playerOut?: string;
  jerseyNumberOut?: number;
  minute: string;
  createdAt: number;
  isStaff?: boolean;
}

export interface Standing {
  id: string;
  tournamentId: string;
  group: string;
  team: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  points: number;
}

"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { subscribeMatch, subscribeEvents, getTeams, buildLogoMap } from "@/lib/firestore";
import { EVENT_META, eventLabel } from "@/lib/events";
import type { Match, MatchEvent, SetScore, QuarterScore } from "@/types";

const STATUS_BADGE: Record<string, string> = {
  upcoming: "bg-gray-700 text-gray-300",
  live: "bg-red-600 text-white animate-pulse",
  full_time: "bg-green-700 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  live: "Live",
  full_time: "Full Time",
};

function EventRow({ event, match }: { event: MatchEvent; match: Match }) {
  const isTeam1 = event.team === "team1";
  const playerStr = `${event.jerseyNumber ? `#${event.jerseyNumber} ` : ""}${event.player}`;
  const playerOutStr = event.playerOut
    ? `${event.jerseyNumberOut ? `#${event.jerseyNumberOut} ` : ""}${event.playerOut}`
    : "";
  const { icon } = EVENT_META[event.type];
  const label =
    event.type === "substitution"
      ? `${icon} in ${playerStr}${playerOutStr ? ` out ${playerOutStr}` : ""}`
      : `${eventLabel(event.type)} – ${playerStr}${event.isStaff ? " (Staff)" : ""}`;

  return (
    <div className="grid grid-cols-[1fr_80px_1fr] gap-2 py-2 border-b border-gray-800 text-sm">
      <div className={`text-right ${isTeam1 ? "text-white" : "text-gray-600"}`}>
        {isTeam1 ? label : ""}
      </div>
      <div className="text-center text-gray-400 font-mono">{event.minute}&apos;</div>
      <div className={`text-left ${!isTeam1 ? "text-white" : "text-gray-600"}`}>
        {!isTeam1 ? label : ""}
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [extraSeconds, setExtraSeconds] = useState(0);

  useEffect(() => {
    return subscribeMatch(id, (m) => {
      if (!m) return;
      setMatch(m);
      document.title = `${m.team1} vs ${m.team2} | Uni Sports Scoreboard`;
    });
  }, [id]);

  useEffect(() => {
    if (!match?.tournamentId) return;
    getTeams(match.tournamentId).then((teams) => setLogoMap(buildLogoMap(teams)));
  }, [match?.tournamentId]);

  useEffect(() => {
    const unsub = subscribeEvents(id, setEvents);
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!match) return;

    if (match.extraTimeStartedAt || (match.extraTimeElapsed ?? 0) > 0) {
      const calcExtra = () => {
        const base = match.extraTimeElapsed ?? 0;
        return match.extraTimeStartedAt
          ? base + (Date.now() - match.extraTimeStartedAt) / 1000
          : base;
      };
      setDisplaySeconds(match.timerElapsed ?? 0);
      setExtraSeconds(calcExtra());
      if (!match.extraTimeStartedAt) return;
      const iv = setInterval(() => setExtraSeconds(calcExtra()), 1000);
      return () => clearInterval(iv);
    }

    setExtraSeconds(0);
    const elapsed = match.timerElapsed ?? 0;
    const calc = () => match.timerStartedAt
      ? elapsed + (Date.now() - match.timerStartedAt) / 1000
      : elapsed;
    setDisplaySeconds(calc());
    if (!match.timerStartedAt) return;
    const interval = setInterval(() => setDisplaySeconds(calc()), 1000);
    return () => clearInterval(interval);
  }, [match?.timerStartedAt, match?.timerElapsed, match?.extraTimeStartedAt]);

  if (!match) return <p className="text-gray-500">กำลังโหลด...</p>;

  const hasPenalty = match.penalty1 !== undefined && match.penalty2 !== undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
        ← กลับหน้าตารางแข่งขัน
      </Link>

      {/* Match Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">{match.round}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${STATUS_BADGE[match.status]}`}>
            {STATUS_LABEL[match.status]}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center flex flex-col items-center gap-2">
            {logoMap[match.team1] && (
              <img src={logoMap[match.team1]} alt={match.team1} className="w-14 h-14 rounded-full object-cover" />
            )}
            <div>
              <h2 className="text-white font-bold text-xl">{match.team1}</h2>
              {match.team1Full && <p className="text-gray-400 text-xs mt-0.5">{match.team1Full}</p>}
            </div>
          </div>
          <div className="text-center min-w-[120px]">
            {match.status === "upcoming" ? (
              <span className="text-gray-400 text-2xl font-bold">vs</span>
            ) : (
              <>
                <span className="text-white text-4xl font-bold tracking-widest">
                  {match.score1} : {match.score2}
                </span>
                {hasPenalty && (
                  <p className="text-gray-400 text-sm mt-1">
                    [{match.penalty1}] - [{match.penalty2}]
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex-1 text-center flex flex-col items-center gap-2">
            {logoMap[match.team2] && (
              <img src={logoMap[match.team2]} alt={match.team2} className="w-14 h-14 rounded-full object-cover" />
            )}
            <div>
              <h2 className="text-white font-bold text-xl">{match.team2}</h2>
              {match.team2Full && <p className="text-gray-400 text-xs mt-0.5">{match.team2Full}</p>}
            </div>
          </div>
        </div>

        {match.status === "live" && (match.halfDuration ?? 0) > 0 && (!!match.timerStartedAt || (match.timerElapsed ?? 0) > 0) && (() => {
          const phase = match.timerPhase ?? "1st";
          const isHalfTime = phase === "1st_extra" && !match.extraTimeStartedAt;
          const totalMin = Math.floor(displaySeconds / 60);
          const totalSec = Math.floor(displaySeconds % 60);
          const inExtra = (phase === "1st_extra" || phase === "2nd_extra") && !isHalfTime;
          const halfLabel = phase === "1st" || phase === "1st_extra" ? "1st Half" : "2nd Half";
          const halfColor = phase === "1st" || phase === "1st_extra" ? "bg-blue-900 text-blue-300" : "bg-orange-900 text-orange-300";
          const extraMin = Math.floor(extraSeconds / 60);
          const extraSec = Math.floor(extraSeconds % 60);

          if (isHalfTime) {
            return (
              <div className="flex flex-col items-center gap-1 mt-3">
                <span className="text-sm font-bold px-4 py-1 rounded bg-gray-600 text-white tracking-widest">
                  HALF TIME
                </span>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center gap-1 mt-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${halfColor}`}>
                {halfLabel}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold text-lg tabular-nums">
                  {String(totalMin).padStart(2, "0")}:{String(totalSec).padStart(2, "0")}
                </span>
                {inExtra && (
                  <span className="text-yellow-400 font-mono font-bold text-lg tabular-nums">
                    +{String(extraMin).padStart(2, "0")}:{String(extraSec).padStart(2, "0")}
                  </span>
                )}
              </div>
            </div>
          );
        })()}
        <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
          <span>{match.date}</span>
          <span>{match.time}</span>
          <span>{match.field}</span>
        </div>
      </div>

      {/* Volleyball Sets */}
      {match.sport === "volleyball" && match.sets && match.sets.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-4">
          <h3 className="font-semibold mb-3">คะแนนแต่ละเซต</h3>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-2 items-center text-sm">
            <div className="text-center text-xs text-gray-400 font-semibold">{match.team1}</div>
            <div />
            <div className="text-center text-xs text-gray-400 font-semibold">{match.team2}</div>
            {(match.sets as SetScore[]).map((s, i) => {
              const win1 = s.s1 > s.s2;
              const win2 = s.s2 > s.s1;
              return (
                <Fragment key={i}>
                  <div className={`text-center font-bold text-lg ${win1 ? "text-white" : "text-gray-500"}`}>{s.s1}</div>
                  <div className="text-center text-xs text-gray-500">เซต {i + 1}</div>
                  <div className={`text-center font-bold text-lg ${win2 ? "text-white" : "text-gray-500"}`}>{s.s2}</div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Basketball Quarters */}
      {match.sport === "basketball" && match.quarters && match.quarters.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-4">
          <h3 className="font-semibold mb-3">คะแนนแต่ละไตรมาส</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left py-1 pr-4">ทีม</th>
                  {(match.quarters as QuarterScore[]).map((_, i) => (
                    <th key={i} className="py-1 px-2">{i < 4 ? `Q${i + 1}` : `OT${i - 3}`}</th>
                  ))}
                  <th className="py-1 px-2 text-white font-bold">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-700">
                  <td className="text-left py-2 pr-4 text-white font-semibold">{match.team1}</td>
                  {(match.quarters as QuarterScore[]).map((q, i) => (
                    <td key={i} className="py-2 px-2 text-gray-300">{q.s1}</td>
                  ))}
                  <td className="py-2 px-2 text-white font-bold">{(match.quarters as QuarterScore[]).reduce((a, q) => a + q.s1, 0)}</td>
                </tr>
                <tr className="border-t border-gray-700">
                  <td className="text-left py-2 pr-4 text-white font-semibold">{match.team2}</td>
                  {(match.quarters as QuarterScore[]).map((q, i) => (
                    <td key={i} className="py-2 px-2 text-gray-300">{q.s2}</td>
                  ))}
                  <td className="py-2 px-2 text-white font-bold">{(match.quarters as QuarterScore[]).reduce((a, q) => a + q.s2, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Timeline */}
      {events.length > 0 && (match.sport === "football" || match.sport === "futsal") && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
          <h3 className="font-semibold mb-1">เหตุการณ์ในเกม</h3>
          <div className="grid grid-cols-[1fr_80px_1fr] gap-2 mb-2">
            <div className="text-right text-xs text-gray-500">{match.team1}</div>
            <div></div>
            <div className="text-left text-xs text-gray-500">{match.team2}</div>
          </div>
          {events.map((e) => (
            <EventRow key={e.id} event={e} match={match} />
          ))}
        </div>
      )}

      {/* Match Stats — football/futsal only */}
      {(match.sport === "football" || match.sport === "futsal") && match.status !== "upcoming" && (() => {
        const yellowCards1 = events.filter(e => e.type === "yellow_card" && e.team === "team1").length;
        const yellowCards2 = events.filter(e => e.type === "yellow_card" && e.team === "team2").length;
        const redCards1 = events.filter(e => e.type === "red_card" && e.team === "team1").length;
        const redCards2 = events.filter(e => e.type === "red_card" && e.team === "team2").length;
        const hasStats = (match.shots1 ?? 0) + (match.shots2 ?? 0) + (match.corners1 ?? 0) + (match.corners2 ?? 0) > 0;
        if (!hasStats && yellowCards1 + yellowCards2 + redCards1 + redCards2 === 0) return null;
        const rows = [
          ...(hasStats ? [
            { label: "Shots", v1: match.shots1 ?? 0, v2: match.shots2 ?? 0 },
            { label: "On Target", v1: match.onTarget1 ?? 0, v2: match.onTarget2 ?? 0 },
            { label: "Corners", v1: match.corners1 ?? 0, v2: match.corners2 ?? 0 },
            { label: "Fouls", v1: match.fouls1 ?? 0, v2: match.fouls2 ?? 0 },
            { label: "Offsides", v1: match.offsides1 ?? 0, v2: match.offsides2 ?? 0 },
          ] : []),
          { label: "Yellow Cards", v1: yellowCards1, v2: yellowCards2, highlight: "yellow" },
          { label: "Red Cards", v1: redCards1, v2: redCards2, highlight: "red" },
        ];
        return (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 mt-4">
            <h3 className="font-semibold mb-3">Match Stats</h3>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-2 items-center">
              <div className="text-center text-xs text-gray-400 font-semibold">{match.team1}</div>
              <div className="text-center text-xs text-gray-500">Match Stats</div>
              <div className="text-center text-xs text-gray-400 font-semibold">{match.team2}</div>
              {rows.map(({ label, v1, v2, highlight }) => {
                const labelColor = highlight === "yellow" ? "text-yellow-400" : highlight === "red" ? "text-red-400" : "text-gray-500";
                return (
                  <Fragment key={label}>
                    <div className="text-center font-bold text-white">{v1}</div>
                    <div className={`text-center text-xs ${labelColor} whitespace-nowrap`}>{label}</div>
                    <div className="text-center font-bold text-white">{v2}</div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })()}

      {match.status === "upcoming" && events.length === 0 && (
        <p className="text-gray-500 text-center py-8">ยังไม่เริ่มการแข่งขัน</p>
      )}
    </div>
  );
}

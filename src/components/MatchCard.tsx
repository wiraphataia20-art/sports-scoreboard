import Link from "next/link";
import type { Match } from "@/types";
import TeamLogo from "@/components/TeamLogo";

const statusConfig = {
  upcoming: { label: "Upcoming", className: "bg-gray-700 text-gray-300" },
  live:     { label: "Live",     className: "bg-red-600 text-white animate-pulse" },
  full_time:{ label: "Full Time",className: "bg-green-700 text-white" },
};

const sportLabels: Record<string, string> = {
  football:   "FOOTBALL",
  basketball: "BASKETBALL",
  volleyball: "VOLLEYBALL",
  futsal:     "FUTSAL",
};

export default function MatchCard({ match, logoMap }: { match: Match; logoMap?: Record<string, string> }) {
  const status = statusConfig[match.status];
  const hasPenalty = match.penalty1 !== undefined && match.penalty2 !== undefined;
  const isPostponed = match.status === "upcoming" && match.scheduleStatus === "postponed";
  const isRescheduled = match.status === "upcoming" && match.scheduleStatus === "rescheduled";
  const statusLabel = isPostponed ? "Postponed" : isRescheduled ? "Rescheduled" : status.label;
  const statusClassName = isPostponed
    ? "bg-amber-700 text-white"
    : isRescheduled
      ? "bg-blue-700 text-white"
      : status.className;

  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              {sportLabels[match.sport] ?? match.sport.toUpperCase()}
            </span>
            {match.stage === "knockout" && (
              <span className="text-xs font-bold bg-orange-900 text-orange-300 px-2 py-0.5 rounded">Knockout</span>
            )}
            <span className="text-xs text-gray-400">{match.round}</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${statusClassName}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo name={match.team1} logoUrl={logoMap?.[match.team1]} />
            <span className="text-white font-bold text-lg truncate">{match.team1}</span>
          </div>

          <div className="text-center shrink-0">
            {match.status === "upcoming" ? (
              <span className="text-gray-400 text-xl font-bold">vs</span>
            ) : (
              <>
                <span className="text-white text-2xl font-bold tracking-widest">
                  {match.score1} : {match.score2}
                </span>
                {hasPenalty && (
                  <p className="text-gray-400 text-xs mt-0.5">[{match.penalty1}] - [{match.penalty2}]</p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-white font-bold text-lg truncate text-right">{match.team2}</span>
            <TeamLogo name={match.team2} logoUrl={logoMap?.[match.team2]} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 text-xs text-gray-500">
          <span>Field: {match.field}</span>
          {isPostponed ? (
            <span className="text-amber-400 text-right">รอกำหนดวันและเวลาใหม่</span>
          ) : (
            <span className={isRescheduled ? "text-blue-400" : ""}>
              {isRescheduled ? `กำหนดใหม่: ${match.date} ${match.time}` : `Time: ${match.time}`}
            </span>
          )}
        </div>
        {match.status === "upcoming" && match.scheduleNote && (isPostponed || isRescheduled) && (
          <p className="mt-2 text-xs text-gray-400 border-t border-gray-700 pt-2">หมายเหตุ: {match.scheduleNote}</p>
        )}
      </div>
    </Link>
  );
}

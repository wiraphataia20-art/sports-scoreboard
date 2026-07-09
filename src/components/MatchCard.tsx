import Link from "next/link";
import type { Match } from "@/types";

const statusConfig = {
  upcoming: { label: "Upcoming", className: "bg-gray-700 text-gray-300" },
  live: { label: "Live", className: "bg-red-600 text-white animate-pulse" },
  full_time: { label: "Full Time", className: "bg-green-700 text-white" },
};

const sportLabels: Record<string, string> = {
  football: "FOOTBALL",
  basketball: "BASKETBALL",
  volleyball: "VOLLEYBALL",
  futsal: "FUTSAL",
};

export default function MatchCard({ match }: { match: Match }) {
  const status = statusConfig[match.status];
  const hasPenalty = match.penalty1 !== undefined && match.penalty2 !== undefined;

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
          <span className={`text-xs font-semibold px-2.5 py-1 rounded ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-lg w-2/5">{match.team1}</span>
          <div className="text-center">
            {match.status === "upcoming" ? (
              <span className="text-gray-400 text-xl font-bold">vs</span>
            ) : (
              <div className="text-center">
                <span className="text-white text-2xl font-bold tracking-widest">
                  {match.score1} : {match.score2}
                </span>
                {hasPenalty && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    [{match.penalty1}] - [{match.penalty2}]
                  </p>
                )}
              </div>
            )}
          </div>
          <span className="text-white font-bold text-lg w-2/5 text-right">{match.team2}</span>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>Field: {match.field}</span>
          <span>Time: {match.time}</span>
        </div>
      </div>
    </Link>
  );
}

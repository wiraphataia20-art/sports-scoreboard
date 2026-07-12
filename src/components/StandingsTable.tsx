import type { Standing } from "@/types";
import TeamLogo from "@/components/TeamLogo";

export default function StandingsTable({ standings, logoMap }: {
  standings: Standing[];
  logoMap?: Record<string, string>;
}) {
  if (standings.length === 0) {
    return <p className="text-gray-500 text-center py-8">ยังไม่มีข้อมูล Standings</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2 px-3 w-8">#</th>
            <th className="text-left py-2 px-3">ทีม</th>
            <th className="text-center py-2 px-3">P</th>
            <th className="text-center py-2 px-3">W</th>
            <th className="text-center py-2 px-3">D</th>
            <th className="text-center py-2 px-3">L</th>
            <th className="text-center py-2 px-3">GF</th>
            <th className="text-center py-2 px-3">GA</th>
            <th className="text-center py-2 px-3">GD</th>
            <th className="text-center py-2 px-3 font-bold text-white">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
              <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <TeamLogo name={s.team} logoUrl={logoMap?.[s.team]} className="w-6 h-6" />
                  <span className="text-white font-medium">{s.team}</span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-center text-gray-300">{s.played}</td>
              <td className="py-2.5 px-3 text-center text-green-400">{s.win}</td>
              <td className="py-2.5 px-3 text-center text-gray-300">{s.draw}</td>
              <td className="py-2.5 px-3 text-center text-red-400">{s.loss}</td>
              <td className="py-2.5 px-3 text-center text-gray-300">{s.gf}</td>
              <td className="py-2.5 px-3 text-center text-gray-300">{s.ga}</td>
              <td className="py-2.5 px-3 text-center text-gray-300">{s.gf - s.ga}</td>
              <td className="py-2.5 px-3 text-center text-white font-bold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { statsData } from "../data/mockData";
import StatsCard from "./StatsCard";

export default function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => (
        <StatsCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

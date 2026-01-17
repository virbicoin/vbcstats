import { MinerData } from '../types/stats';

interface MinerBlocksProps {
  miners: MinerData[];
}

export default function MinerBlocks({ miners }: MinerBlocksProps) {
  if (!miners || miners.length === 0) {
    return <div className="text-center text-gray-400 py-4">No miner data available</div>;
  }

  return (
    <div className="space-y-2">
      {miners.slice(0, 5).map((miner) => (
        <div
          key={miner.miner || miner.name}
          className="flex items-center justify-between p-2 rounded border border-[#1e3a5f] bg-[#0d1421] hover:bg-gray-750 transition-colors duration-200"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getMinerColor(miner.blocks)} shadow-sm`}></div>
            <span className="text-xs text-gray-300 truncate max-w-20 font-medium">
              {miner.name || miner.miner}
            </span>
          </div>
          <span className={`text-xs font-semibold ${getMinerTextColor(miner.blocks)}`}>
            {miner.blocks}
          </span>
        </div>
      ))}
      {miners.length > 5 && (
        <div className="text-xs text-gray-500 text-center py-1">
          +{miners.length - 5} more miners
        </div>
      )}
    </div>
  );
}

function getMinerColor(blocks: number): string {
  if (blocks >= 10) return 'bg-green-400';
  if (blocks >= 5) return 'bg-yellow-400';
  if (blocks >= 1) return 'bg-emerald-400';
  return 'bg-gray-400';
}

function getMinerTextColor(blocks: number): string {
  if (blocks >= 10) return 'text-blue-400';
  if (blocks >= 5) return 'text-yellow-400';
  if (blocks >= 1) return 'text-blue-400';
  return 'text-gray-400';
}

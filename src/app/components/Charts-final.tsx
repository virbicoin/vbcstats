'use client';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

interface ChartData {
  time: string;
  index: number;
  blockTime: number;
  difficulty: number;
  uncles: number;
  transactions: number;
  gasSpending: number;
  propagation: number;
}

interface ChartsProps {
  currentStats: {
    avgBlockTime?: { value: number };
    difficulty?: { value: number };
    uncles?: { value: number };
  };
}

const Charts: React.FC<ChartsProps> = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [staticTimeLabels, setStaticTimeLabels] = useState<string[]>([]);

  // Initialize chart data only once
  useEffect(() => {
    if (!isInitialized) {
      const generateData = () => {
        const data: ChartData[] = [];
        const timeLabels: string[] = [];
        const now = new Date();

        // Start from current minute rounded down
        const currentMinute = new Date(now);
        currentMinute.setSeconds(0, 0);

        for (let i = 19; i >= 0; i--) {
          const time = new Date(currentMinute.getTime() - i * 300000); // 5 minute intervals
          const timeString = time.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

          timeLabels.push(timeString);

          data.push({
            time: timeString,
            index: 19 - i,
            blockTime: 13 + (Math.random() - 0.5) * 0.6,
            difficulty: 94 + (Math.random() - 0.5) * 1.2,
            uncles: Math.floor(Math.random() * 3),
            transactions: Math.floor(Math.random() * 50) + 15,
            gasSpending: Math.random() * 70 + 25,
            propagation: Math.random() * 40 + 85,
          });
        }

        setStaticTimeLabels(timeLabels);
        return data;
      };

      setChartData(generateData());
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Completely static X-axis configuration without any dynamic elements
  const xAxisConfig = {
    dataKey: 'index',
    hide: true, // Hide X-axis completely to prevent any flickering
    type: 'number' as const,
    domain: [0, 19],
  };

  // Static time labels component
  const TimeLabels = React.memo(() => (
    <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
      {staticTimeLabels
        .filter((_, index) => [0, 4, 8, 12, 16, 19].includes(index))
        .map((label, idx) => (
          <span key={idx}>{label}</span>
        ))}
    </div>
  ));
  TimeLabels.displayName = 'TimeLabels';

  return (
    <>
      {/* Block Time Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Block Time</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[12, 14]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="blockTime"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                animationDuration={0}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Difficulty Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Difficulty</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[90, 98]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="difficulty"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={0}
                isAnimationActive={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Uncle Count Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Uncle Count</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 3]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Bar
                dataKey="uncles"
                fill="#a855f7"
                radius={[2, 2, 0, 0]}
                animationDuration={0}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Block Propagation Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Block Propagation</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[50, 150]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="propagation"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                animationDuration={0}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Transactions Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Transactions</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 70]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Bar
                dataKey="transactions"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                animationDuration={0}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Gas Spending Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gas Spending</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="gasSpending"
                stroke="#f43f5e"
                fill="#f43f5e"
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={0}
                isAnimationActive={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>

      {/* Gas Limit Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gas Limit</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData.map((item) => ({ ...item, gasLimit: 8000000 }))}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis {...xAxisConfig} />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[7900000, 8100000]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="gasLimit"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                animationDuration={0}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <TimeLabels />
      </div>
    </>
  );
};

export default Charts;

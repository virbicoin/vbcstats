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

const Charts: React.FC<ChartsProps> = ({ currentStats }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Initialize chart data only once
  useEffect(() => {
    if (!isInitialized) {
      const generateData = () => {
        const data: ChartData[] = [];
        const now = new Date();

        // Start from current minute rounded down
        const currentMinute = new Date(now);
        currentMinute.setSeconds(0, 0);

        for (let i = 19; i >= 0; i--) {
          const time = new Date(currentMinute.getTime() - i * 300000); // 5 minute intervals

          data.push({
            time: time.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            index: 19 - i,
            blockTime: 13 + (Math.random() - 0.5) * 0.6,
            difficulty: 94 + (Math.random() - 0.5) * 1.2,
            uncles: Math.floor(Math.random() * 3),
            transactions: Math.floor(Math.random() * 50) + 15,
            gasSpending: Math.random() * 70 + 25,
            propagation: Math.random() * 40 + 85,
          });
        }

        return data;
      };

      setChartData(generateData());
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update chart data with much longer intervals to prevent flickering
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const now = new Date();

      // Only update every 2 minutes to minimize flickering
      if (now.getMinutes() % 2 !== 0 || now.getSeconds() !== 0) return;

      setChartData((prevData) => {
        const newData = [...prevData];

        // Round to nearest minute to ensure consistent time display
        const roundedTime = new Date(now);
        roundedTime.setSeconds(0, 0);

        // Use Japanese locale and fixed time format to match browser
        const timeString = roundedTime.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        // Check if this time already exists to prevent duplicates
        if (
          newData.length > 0 &&
          (newData[newData.length - 1].time === timeString || lastUpdateTime === timeString)
        ) {
          return prevData; // No change needed
        }

        // Update last update time tracker
        setLastUpdateTime(timeString);

        // Remove oldest point and add new one (sliding window)
        newData.shift();

        // Re-index all items to maintain consistent indices
        newData.forEach((item, idx) => {
          item.index = idx;
        });

        newData.push({
          time: timeString,
          index: 19,
          blockTime: currentStats.avgBlockTime?.value || 13 + (Math.random() - 0.5) * 0.4,
          difficulty: currentStats.difficulty?.value || 94 + (Math.random() - 0.5) * 0.8,
          uncles: currentStats.uncles?.value || Math.floor(Math.random() * 3),
          transactions: Math.floor(Math.random() * 50) + 15,
          gasSpending: Math.random() * 70 + 25,
          propagation: Math.random() * 40 + 85,
        });

        return newData;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isInitialized, currentStats, lastUpdateTime]);

  // Static X-axis configuration using index to completely prevent flickering
  const xAxisConfig = {
    dataKey: 'index',
    stroke: '#9ca3af',
    fontSize: 10,
    tickLine: false,
    axisLine: false,
    interval: 4,
    minTickGap: 60,
    tick: { fontSize: 10 },
    allowDataOverflow: false,
    tickFormatter: (value: number) => {
      if (chartData && chartData[value]) {
        return chartData[value].time;
      }
      return '';
    },
    type: 'number' as const,
    domain: [0, 19],
    ticks: [0, 4, 8, 12, 16, 19],
  };

  return (
    <>
      {/* Block Time Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Block Time</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              key="block-time-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Difficulty Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Difficulty</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              key="difficulty-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Uncle Count Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Uncle Count</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              key="uncle-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Block Propagation Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Block Propagation</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              key="block-propagation-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Transactions Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Transactions</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              key="transactions-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Gas Spending Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gas Spending</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              key="gas-spending-chart"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
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
      </div>

      {/* Gas Limit Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Gas Limit</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData.map((item) => ({ ...item, gasLimit: 8000000 }))}
              key="gas-limit-chart"
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
      </div>
    </>
  );
};

export default Charts;

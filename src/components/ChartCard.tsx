'use client'

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface IconProps {
  name: string
  className?: string
}

interface ChartCardProps {
  icon: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: number[] | any[]
  type: 'sparkline' | 'histogram'
  className?: string
}

const Icon: React.FC<IconProps> = ({ name, className = "w-5 h-5" }) => {
  switch (name) {
    case 'time':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    case 'gas':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    case 'transaction':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    case 'gasprice':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      )
    case 'difficulty':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    case 'uncle':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
  }
}

const ChartCard: React.FC<ChartCardProps> = ({ icon, label, data, type, className = "text-blue-400" }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 200
    const height = 60
    const margin = { top: 5, right: 5, bottom: 5, left: 5 }

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    if (type === 'sparkline') {
      const numericData = data as number[]
      if (numericData.length === 0) return

      const xScale = d3.scaleLinear()
        .domain([0, numericData.length - 1])
        .range([0, chartWidth])

      const yScale = d3.scaleLinear()
        .domain([d3.min(numericData) || 0, d3.max(numericData) || 0])
        .range([chartHeight, 0])

      const line = d3.line<number>()
        .x((_, i) => xScale(i))
        .y(d => yScale(d))
        .curve(d3.curveMonotoneX)

      // Draw the line
      chart.append("path")
        .datum(numericData)
        .attr("fill", "none")
        .attr("stroke", "currentColor")
        .attr("stroke-width", 2)
        .attr("d", line)

      // Add invisible circles for hover interaction
      chart.selectAll("circle")
        .data(numericData)
        .enter()
        .append("circle")
        .attr("cx", (_, i) => xScale(i))
        .attr("cy", d => yScale(d))
        .attr("r", 3)
        .attr("fill", "transparent")
        .attr("stroke", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          // Show tooltip
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("padding", "6px 10px")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("border", "1px solid rgba(255, 255, 255, 0.2)")
            .style("backdrop-filter", "blur(10px)")
            .text(`Value: ${d}`)

          // Position tooltip
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")

          // Highlight circle
          d3.select(this)
            .attr("r", 6)
            .attr("fill", "currentColor")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
        })
        .on("mouseout", function() {
          // Remove tooltip
          d3.selectAll(".tooltip").remove()

          // Reset circle
          d3.select(this)
            .attr("r", 3)
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
        })
    } else if (type === 'histogram') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const histogramData = data as any[]
      if (histogramData.length === 0) return

      // const xScale = d3.scaleLinear()
      //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //   .domain([0, d3.max(histogramData, (d: any) => d.value) || 0])
      //   .range([0, chartWidth])

      const yScale = d3.scaleLinear()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .domain([0, d3.max(histogramData, (d: any) => d.count) || 0])
        .range([chartHeight, 0])

      const barWidth = chartWidth / histogramData.length

      chart.selectAll("rect")
        .data(histogramData)
        .enter()
        .append("rect")
        .attr("x", (_, i) => i * barWidth)
        .attr("y", d => yScale(d.count))
        .attr("width", barWidth - 1)
        .attr("height", d => chartHeight - yScale(d.count))
        .attr("fill", "currentColor")
        .attr("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          // Show tooltip
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("padding", "6px 10px")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("border", "1px solid rgba(255, 255, 255, 0.2)")
            .style("backdrop-filter", "blur(10px)")
            .text(`Value: ${d.value}, Count: ${d.count}`)

          // Position tooltip
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")

          // Highlight bar
          d3.select(this)
            .attr("opacity", 1)
        })
        .on("mouseout", function() {
          // Remove tooltip
          d3.selectAll(".tooltip").remove()

          // Reset bar
          d3.select(this)
            .attr("opacity", 0.7)
        })
    }
  }, [data, type])

  // Get the last value for display
  const getLastValue = () => {
    if (!data || data.length === 0) return 'N/A'
    
    if (type === 'sparkline') {
      const numericData = data as number[]
      const lastValue = numericData[numericData.length - 1]
      if (lastValue === undefined) return 'N/A'
      
      // Scale difficulty values for display
      if (label === 'Difficulty') {
        return (lastValue / 1000000000000000).toFixed(2)
      }
      
      return lastValue.toFixed(2) || 'N/A'
    } else if (type === 'histogram') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const histogramData = data as any[]
      const lastItem = histogramData[histogramData.length - 1]
      return lastItem ? `${lastItem.value}` : 'N/A'
    }
    return 'N/A'
  }

  return (
    <div className="chart-container bg-gray-800 rounded-lg border border-gray-700 p-4 hover:bg-gray-750 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Icon name={icon} className={`w-4 h-4 mr-2 ${className}`} />
          <span className="text-xs font-medium text-gray-400">{label}</span>
        </div>
        <span className={`text-xs font-bold ${className}`}>
          {getLastValue()}
        </span>
      </div>
      <svg
        ref={svgRef}
        width="200"
        height="60"
        className={`w-full h-15 ${className}`}
      />
    </div>
  )
}

export default ChartCard 
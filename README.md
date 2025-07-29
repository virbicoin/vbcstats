# VBC Stats - Network Dashboard

A modern, real-time blockchain network statistics dashboard built with Next.js 15, React 18, and TypeScript.

## Features

- **Real-time Statistics**: Live updates of blockchain network metrics
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Interactive Charts**: D3.js powered sparklines and histograms
- **TypeScript**: Full type safety and better developer experience
- **Next.js 15**: Latest React framework with App Router

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: D3.js
- **Real-time**: Socket.IO Client
- **Icons**: Custom SVG icons

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vbcstats
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/          # React components
│   ├── StatCard.tsx    # Statistics card
│   ├── ChartCard.tsx   # Chart component
│   └── MinerBlocks.tsx # Miner blocks display
└── types/              # TypeScript type definitions
    ├── stats.ts        # Statistics types
    └── icons.ts        # Icon types
```

## Features

### Network Statistics
- Best block number
- Last block timestamp
- Average block time
- Gas price and limit
- Active/total nodes

### Real-time Charts
- Block time sparklines
- Block propagation histograms
- Transaction density
- Gas spending trends
- Gas limit history

### Miner Information
- Top miners by blocks
- Block count per miner
- Visual indicators

## Configuration

The application connects to a WebSocket server for real-time data. Update the socket connection URL in `src/app/page.tsx` if needed:

```typescript
const newSocket = io('http://localhost:3000', {
  path: '/primus'
})
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

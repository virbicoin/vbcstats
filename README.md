# VBC Stats - Network Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.17.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

A modern, real-time blockchain network statistics dashboard for VirBiCoin/GreenVibes Coin (GVBC) built with Next.js 16, React 19, and TypeScript.

## Features

- **Real-time Statistics**: Live updates of blockchain network metrics via WebSocket
- **Network Map**: Interactive world map showing node locations with Leaflet
- **Modern UI**: Beautiful, responsive design with Tailwind CSS 4.x
- **Interactive Charts**: Recharts and D3.js powered visualizations
- **Node Management**: Sortable, filterable node table with real-time updates
- **TypeScript**: Full type safety and better developer experience
- **Docker Support**: Production-ready Docker configuration

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4.x |
| Charts | Recharts, D3.js |
| Maps | Leaflet, React-Leaflet |
| Real-time | Primus (WebSocket) |
| Backend | Express 5, Node.js |
| GeoIP | geoip-lite |

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm 9.x or later

### Installation

1. Clone the repository:

```bash
git clone https://github.com/virbicoin/vbcstats.git
cd vbcstats
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:

```env
PORT=3000
PORT_SERVER=4000
WS_SECRET=your_secret_here
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Next.js + WebSocket) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | Run ESLint, TypeScript check, and Prettier |
| `npm run lint` | Run ESLint only |
| `npm run lint:fix` | Fix ESLint errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main dashboard page
│   ├── providers.tsx         # React context providers
│   └── api/
│       └── geoip/route.ts    # GeoIP API endpoint
├── components/               # UI components
│   ├── Charts.tsx            # Chart grid
│   ├── Nodes.tsx             # Node table
│   ├── Map.tsx               # Leaflet map component
│   ├── ChartCard.tsx         # D3.js chart card
│   ├── StatCard.tsx          # Statistics card
│   ├── WorldMap.tsx          # World map component
│   └── MinerBlocks.tsx       # Miner blocks display
├── types/                    # TypeScript types
│   ├── stats.ts              # Statistics types
│   └── icons.ts              # Icon types
├── lib/                      # Server-side libraries (CommonJS)
│   ├── express.js            # Express app setup
│   ├── collection.js         # Node collection management
│   └── history.js            # Block history management
└── server-simple.js          # WebSocket server (Primus)
```

## Dashboard Features

### Network Statistics
- Best block number with real-time updates
- Last block timestamp with color-coded age indicator
- Average block time calculation
- Network difficulty and hashrate
- Gas price and gas limit
- Active/total node count

### Real-time Charts
- Block time trends (LineChart)
- Network difficulty (AreaChart)
- Transaction count (AreaChart)
- Block propagation times (LineChart)
- Uncle count (BarChart)
- Gas spending (AreaChart)

### Node Information
- Sortable columns (name, latency, block, etc.)
- Pin favorite nodes
- Real-time latency and propagation display
- Geographic location via GeoIP
- Block time counter per node

### Network Map
- Interactive Leaflet map
- Node markers with active/inactive status
- Popup with node details

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t vbcstats .

# Run container
docker run -d -p 3000:3000 -p 4000:4000 \
  -e WS_SECRET=your_secret \
  -e NEXT_PUBLIC_WS_URL=wss://your-domain.com \
  vbcstats
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Next.js server port | `3000` |
| `PORT_SERVER` | WebSocket server port | `4000` |
| `WS_SECRET` | WebSocket authentication secret(s), pipe-separated for multiple | - |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL for clients | - |

## Security

- Environment files (`.env*`) are excluded from version control
- IP address validation on GeoIP API endpoint
- Private IP addresses are filtered from GeoIP lookups
- WebSocket authentication via shared secret

### Security Audit

Run security audit:

```bash
npm audit
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run checks (`npm run check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** strict mode

Run `npm run format` before committing.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on [eth-netstats](https://github.com/cubedro/eth-netstats) architecture
- [goerli/ethstats-server](https://github.com/goerli/ethstats-server) for reference implementation

## Links

- [Repository](https://github.com/virbicoin/vbcstats)
- [Issues](https://github.com/virbicoin/vbcstats/issues)
- [VirBiCoin Website](https://vbc.digitalregion.jp)

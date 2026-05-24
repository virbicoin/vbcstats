# VBC Stats - Network Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.6.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)

A modern, real-time blockchain network statistics dashboard for VirBiCoin/GreenVibes Coin (GVBC). Built with Next.js 16, React 19, and TypeScript 6.

## Features

- **Real-time Statistics**: Live blockchain metrics via WebSocket (Primus)
- **Network Map**: Interactive world map showing node locations with Leaflet
- **Modern UI**: Responsive design with Tailwind CSS 4.x
- **Interactive Charts**: Recharts-powered visualizations
- **Node Management**: Sortable, filterable node table with real-time updates
- **Unified Server**: Single port serves both Next.js and WebSocket
- **Docker Support**: Production-ready Docker configuration
- **geth Compatible**: Works with eth-netstats-client protocol

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 6.0 |
| UI Library | React 19.2 |
| Styling | Tailwind CSS 4.x |
| Charts | Recharts |
| Maps | Leaflet, React-Leaflet |
| Real-time | Primus 8 (WebSocket) |
| Backend | Express 5, Node.js 20+ |
| GeoIP | geoip-lite |
| Runtime | tsx (TypeScript execution) |

## Getting Started

### Prerequisites

- Node.js 20.6.0 or later
- npm 10.x or later

### Installation

```bash
git clone https://github.com/virbicoin/vbcstats.git
cd vbcstats
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000              # Server port (Next.js + WebSocket unified)
WS_SECRET=your_secret  # WebSocket auth secret (multiple: secret1|secret2)
NEXT_PUBLIC_WS_URL=    # Client WebSocket URL (omit for same-origin)
```

### Development

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (unified Next.js + WebSocket) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | Run ESLint + TypeScript check + Prettier check |
| `npm run format` | Format code with Prettier |

## Project Structure

```
vbcstats/
├── app/                    # Next.js App Router (routing only)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   ├── globals.css         # Global styles
│   └── api/geoip/route.ts  # GeoIP API endpoint
├── components/             # UI components
│   ├── Charts.tsx          # Chart grid (Recharts)
│   ├── Nodes.tsx           # Node table
│   ├── Map.tsx             # Leaflet map
│   ├── header.tsx          # Header
│   └── footer.tsx          # Footer
├── lib/                    # Server-side libraries (TypeScript)
│   ├── collection.ts       # Node collection management
│   ├── express.ts          # Express app setup
│   └── utils/config.ts     # Server configuration
├── types/                  # TypeScript type definitions
│   └── server.d.ts         # Ambient module declarations
├── server.ts               # Unified server entry point
├── tsconfig.json           # Frontend TypeScript config
├── tsconfig.server.json    # Server TypeScript config
└── Dockerfile              # Production Docker image
```

## Architecture

The server (`server.ts`) runs on a single port, providing:

- **`/primus`** — WebSocket for browser clients (real-time dashboard updates)
- **`/external`** — WebSocket for external services
- **`/api`** — WebSocket for blockchain nodes (miners/validators)
- **`/*`** — Next.js App Router (all HTTP requests)

## Docker Deployment

```bash
docker build -t vbcstats .
docker run -d -p 5000:5000 \
  -e WS_SECRET=your_secret \
  vbcstats
```

## Security

- WebSocket authentication via shared secret (WS_SECRET)
- IP-based ban list for API connections
- Connection rate limiting (5 connections / 30s)
- IP address validation on GeoIP endpoint
- Private IP filtering
- Environment secrets excluded from version control

## geth Compatibility

Compatible with geth's built-in ethstats client:

- **Latency**: `node-ping` → `node-pong` → `latency` (RTT as string)
- **Blocks**: `difficulty` and `totalDiff` sent as strings, parsed on reception
- **Field mapping**: `totalDiff` → `totalDifficulty`

## Links

- [Repository](https://github.com/virbicoin/vbcstats)
- [Issues](https://github.com/virbicoin/vbcstats/issues)
- [VirBiCoin Website](https://vbc.digitalregion.jp)

## License

MIT License - see [LICENSE](LICENSE) for details.

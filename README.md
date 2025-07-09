# WeatherX League Monorepo

A comprehensive monorepo for the WeatherX League project built with Nx, featuring multiple technology stacks working together.

## Project Structure

```
weatherx-league/
├── contracts/          # TypeScript smart contracts (NEAR)
├── agent/             # TypeScript agent service
├── flow/              # Flow blockchain (Cadence) contracts
├── frontend/          # React TypeScript frontend
├── packages/          # Shared packages
├── nx.json           # Nx configuration
└── README.md         # This file
```

## Technologies Used

- **Nx**: Monorepo management and build system
- **TypeScript (near-sdk-js)**: Smart contract development in `contracts/`
- **TypeScript**: Agent service and frontend development
- **Cadence**: Flow blockchain smart contracts
- **React**: Frontend user interface
- **Material-UI**: React component library

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust (latest stable)
- Flow CLI (for Cadence development)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd weatherx-league
```

2. Install dependencies:
```bash
npm install
```

## Directory Details

### 📜 contracts/ (TypeScript)

Smart contracts written in TypeScript using the near-sdk-js framework.

**Key Files:**
- `package.json` - Contract package configuration
- `src/contract.ts` - Main contract implementation

**Commands:**
```bash
cd contracts
npm install
npm test
```

### 🚀 agent/ (TypeScript)

TypeScript-based agent service for processing weather data and contract interactions.

**Key Files:**
- `package.json` - Node.js project configuration
- `src/index.ts` - Main server application
- `src/services/AgentService.ts` - Core agent logic

**Commands:**
```bash
cd agent
npm install
npm run build
npm run dev      # Development mode
npm start        # Production mode
```

**API Endpoints:**
- `GET /health` - Health check
- `POST /agent/process` - Process weather data or contract interactions

### 🌊 flow/ (Cadence)

Flow blockchain contracts written in Cadence for decentralized weather data management.

**Key Files:**
- `flow.json` - Flow project configuration
- `contracts/WeatherXContract.cdc` - Main weather data contract
- `transactions/SubmitWeatherData.cdc` - Submit weather data transaction
- `scripts/GetWeatherData.cdc` - Read weather data script

**Commands:**
```bash
cd flow
flow emulator start
flow project deploy --network emulator
```

### 🎨 frontend/ (React + TypeScript)

Modern React frontend with Material-UI for interacting with weather data and contracts.

**Key Files:**
- `package.json` - React project configuration
- `src/App.tsx` - Main application component
- `src/components/WeatherDashboard.tsx` - Weather data interface
- `src/components/ContractInteraction.tsx` - Smart contract interface

**Commands:**
```bash
cd frontend
npm install
npm start        # Development server
npm run build    # Production build
```

**Features:**
- Weather data submission and visualization
- Smart contract interaction interface
- Real-time charts and statistics
- Responsive Material-UI design

## Development Workflow

### Running the Full Stack

1. **Start the agent service:**
```bash
cd agent
npm run dev
```

2. **Start the Flow emulator (optional):**
```bash
cd flow
flow emulator start
```

3. **Start the frontend:**
```bash
cd frontend
npm start
```

4. **Build Rust contracts:**
```bash
cd contracts
cargo build
```

### Using Nx Commands

Nx provides powerful commands for managing the monorepo:

```bash
# Generate new applications/libraries
nx generate @nrwl/node:application new-app

# Run commands across the workspace
nx run-many --target=build --all

# Check dependency graph
nx dep-graph

# Run tests
nx test
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Agent         │    │   Contracts     │
│   (React/TS)    │◄──►│   (TypeScript)  │◄──►│   (Rust)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Flow          │
                    │   (Cadence)     │
                    └─────────────────┘
```

## API Integration

The frontend communicates with the agent service through REST API:

```typescript
// Weather data submission
POST /agent/process
{
  "action": "weather_data",
  "data": {
    "temperature": 25.5,
    "humidity": 68
  }
}

// Contract interaction
POST /agent/process
{
  "action": "contract_interaction",
  "data": {
    "contractId": "contract-id",
    "action": "deploy"
  }
}
```

## Testing

Each project includes its own testing setup:

```bash
# Rust tests
cd contracts && cargo test

# TypeScript tests
cd agent && npm test

# React tests
cd frontend && npm test
```

## Building for Production

```bash
# Build all projects
cd contracts && cargo build --release
cd agent && npm run build
cd frontend && npm run build
```

## Contributing

1. Create feature branches for new development
2. Follow the existing code style and patterns
3. Add tests for new functionality
4. Update documentation as needed

## License

This project is licensed under the MIT License.

## Next Steps

- [ ] Implement real blockchain integration
- [ ] Add more sophisticated weather data processing
- [ ] Implement user authentication
- [ ] Add more comprehensive testing
- [ ] Deploy to cloud infrastructure- [ ] Add CI/CD pipeline configuration


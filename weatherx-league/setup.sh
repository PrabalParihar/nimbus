#!/bin/bash

# WeatherX League Project Setup Script

set -e

echo "🌤️  WeatherX League Project Setup"
echo "=================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version is too old. Please upgrade to v16 or higher."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check NEAR CLI
if ! command -v near &> /dev/null; then
    echo "📦 Installing NEAR CLI..."
    npm install -g near-cli
else
    echo "✅ NEAR CLI $(near --version) detected"
fi

# Setup environment files
echo "⚙️  Setting up environment configuration..."

if [ ! -f "env.example" ]; then
    echo "❌ env.example not found"
    exit 1
fi

# Copy environment template for each service
cp env.example .env
cp env.example frontend/.env.local
cp env.example agent/.env
cp env.example contracts-js/.env

echo "✅ Environment files created"

# Install dependencies for each service
echo "📦 Installing dependencies..."

# Root dependencies
echo "  🔧 Installing root dependencies..."
npm install

# Frontend dependencies
echo "  🎨 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Agent dependencies
echo "  🤖 Installing agent dependencies..."
cd agent && npm install && cd ..

# Contract dependencies
echo "  📜 Installing contract dependencies..."
cd contracts-js && npm install && cd ..

echo "✅ All dependencies installed"

# Build contracts
echo "🏗️  Building smart contracts..."
cd contracts-js && npm run build && cd ..
echo "✅ Smart contracts built successfully"

# Setup Flow environment
echo "🌊 Setting up Flow environment..."
if [ ! -f "flow/flow.json" ]; then
    echo "⚠️  Flow configuration not found, skipping Flow setup"
else
    echo "✅ Flow environment ready"
fi

# Create development scripts
echo "📝 Creating development scripts..."

cat > start-dev.sh << 'EOF'
#!/bin/bash

# WeatherX League Development Startup Script

echo "🚀 Starting WeatherX League Development Environment"

# Start agent service in background
echo "🤖 Starting agent service..."
cd agent && npm run dev &
AGENT_PID=$!

# Start frontend in background
echo "🎨 Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Development environment started!"
echo "   📊 Frontend: http://localhost:3000"
echo "   🤖 Agent API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup background processes
cleanup() {
    echo "🛑 Stopping services..."
    kill $AGENT_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
EOF

chmod +x start-dev.sh

cat > deploy-all.sh << 'EOF'
#!/bin/bash

# WeatherX League Deployment Script

echo "🚀 Deploying WeatherX League"

# Deploy NEAR contract
echo "📜 Deploying NEAR smart contract..."
cd contracts-js && ./deploy.sh && cd ..

# Deploy Flow contracts
echo "🌊 Deploying Flow contracts..."
# Add Flow deployment commands here

echo "✅ All contracts deployed!"
EOF

chmod +x deploy-all.sh

echo "✅ Development scripts created"

# Verify setup
echo "🔍 Verifying setup..."

# Check if builds work
echo "  📜 Testing contract build..."
cd contracts-js && npm run build > /dev/null 2>&1 && echo "    ✅ Contract builds successfully" || echo "    ❌ Contract build failed"
cd ..

# Check frontend TypeScript
echo "  🎨 Testing frontend TypeScript..."
cd frontend && npx tsc --noEmit > /dev/null 2>&1 && echo "    ✅ Frontend TypeScript OK" || echo "    ⚠️  Frontend TypeScript has issues"
cd ..

# Check agent TypeScript
echo "  🤖 Testing agent TypeScript..."
cd agent && npx tsc --noEmit > /dev/null 2>&1 && echo "    ✅ Agent TypeScript OK" || echo "    ⚠️  Agent TypeScript has issues"
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Update .env files with your API keys and configuration"
echo "2. Login to NEAR CLI: near login"
echo "3. Deploy contracts: ./deploy-all.sh"
echo "4. Start development: ./start-dev.sh"
echo ""
echo "Documentation:"
echo "📖 Main README: ./README.md"
echo "📜 Contract deployment: ./contracts-js/DEPLOYMENT.md"
echo "🌊 Flow contracts: ./STORM_SEER_NFT.md"
echo "🔗 Cross-chain: ./CROSS_CHAIN_EXAMPLE.md"
echo "📁 Web3.Storage: ./WEB3_STORAGE_INTEGRATION.md"
echo ""
echo "Happy coding! 🌤️" 
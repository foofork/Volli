#!/bin/bash
# Post-Quantum Signaling Test Runner

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🔐 Volly Post-Quantum Signaling Test Suite"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"

# Parse arguments
RUN_MODE=${1:-"test"}
KEEP_RUNNING=${2:-"false"}

case $RUN_MODE in
    "test")
        echo -e "\n${YELLOW}Starting signaling infrastructure...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.signaling.yml up -d
        
        # Wait for health check
        echo "Waiting for signaling server to be ready..."
        MAX_RETRIES=30
        RETRY_COUNT=0
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if curl -s http://localhost:7880/healthz > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Signaling server is ready${NC}"
                break
            fi
            echo -n "."
            sleep 1
            RETRY_COUNT=$((RETRY_COUNT + 1))
        done
        
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo -e "\n${RED}❌ Signaling server failed to start${NC}"
            docker-compose -f docker-compose.signaling.yml logs
            exit 1
        fi
        
        echo -e "\n${YELLOW}Running E2E tests...${NC}"
        pnpm vitest run --config test/e2e/signaling.test.config.ts
        TEST_EXIT_CODE=$?
        
        if [ "$KEEP_RUNNING" != "true" ]; then
            echo -e "\n${YELLOW}Stopping signaling infrastructure...${NC}"
            docker-compose -f docker-compose.signaling.yml down
        else
            echo -e "\n${YELLOW}Signaling server kept running at http://localhost:7880${NC}"
        fi
        
        if [ $TEST_EXIT_CODE -eq 0 ]; then
            echo -e "\n${GREEN}✅ All tests passed!${NC}"
        else
            echo -e "\n${RED}❌ Some tests failed${NC}"
            exit $TEST_EXIT_CODE
        fi
        ;;
        
    "debug")
        echo -e "\n${YELLOW}Starting signaling with debug logging...${NC}"
        cd "$PROJECT_ROOT"
        LOG_LEVEL=debug docker-compose -f docker-compose.signaling.yml up
        ;;
        
    "monitor")
        echo -e "\n${YELLOW}Starting signaling with monitoring stack...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.signaling.yml --profile monitoring up -d
        echo -e "${GREEN}✓ Monitoring available at:${NC}"
        echo "  - Grafana: http://localhost:3000 (admin/admin)"
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Redis Commander: http://localhost:8081"
        ;;
        
    "bench")
        echo -e "\n${YELLOW}Running performance benchmarks...${NC}"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.signaling.yml up -d
        
        # Wait for ready
        sleep 5
        
        # Run only performance tests
        pnpm vitest run --config test/e2e/signaling.test.config.ts -t "Performance"
        
        docker-compose -f docker-compose.signaling.yml down
        ;;
        
    "report")
        echo -e "\n${YELLOW}Generating test report...${NC}"
        if [ -d "test-results/signaling" ]; then
            npx allure generate test-results/signaling -o test-results/signaling-report
            npx allure open test-results/signaling-report
        else
            echo -e "${RED}No test results found. Run tests first.${NC}"
            exit 1
        fi
        ;;
        
    *)
        echo "Usage: $0 [test|debug|monitor|bench|report] [keep-running]"
        echo ""
        echo "Modes:"
        echo "  test    - Run E2E tests (default)"
        echo "  debug   - Start with debug logging"
        echo "  monitor - Start with monitoring stack"
        echo "  bench   - Run performance benchmarks"
        echo "  report  - Generate and open Allure report"
        echo ""
        echo "Options:"
        echo "  keep-running - Keep signaling server running after tests"
        echo ""
        echo "Examples:"
        echo "  $0 test          # Run tests and cleanup"
        echo "  $0 test true     # Run tests, keep server running"
        echo "  $0 monitor       # Start with monitoring"
        echo "  $0 bench         # Run performance tests"
        exit 1
        ;;
esac
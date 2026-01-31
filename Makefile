# =============================================================================
# Lektr Development Makefile
# =============================================================================
# Quick reference:
#   make dev        - Start development environment
#   make stop       - Stop all containers
#   make clean      - Stop and remove volumes (fresh start)
#   make rebuild    - Full rebuild from scratch
#   make logs       - View all logs
# =============================================================================

.PHONY: dev stop clean rebuild logs logs-api logs-ui db-shell help

# Default target
help:
	@echo "Lektr Development Commands"
	@echo "=========================="
	@echo "  make dev       - Start development environment"
	@echo "  make stop      - Stop all containers"
	@echo "  make clean     - Stop and remove all volumes (fresh start)"
	@echo "  make rebuild   - Full rebuild from scratch"
	@echo "  make logs      - View all logs (follow mode)"
	@echo "  make logs-api  - View API logs only"
	@echo "  make logs-ui   - View UI logs only"
	@echo "  make db-shell  - Open psql shell"

# Start development environment
dev:
	docker compose -f docker-compose.dev.yml up

# Start in background
dev-bg:
	docker compose -f docker-compose.dev.yml up -d

# Stop containers
stop:
	docker compose -f docker-compose.dev.yml down

# Clean everything (volumes, images)
clean:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	@echo "✅ Cleaned all containers and volumes"

# Full rebuild (no cache)
rebuild:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker compose -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.dev.yml up

# View logs
logs:
	docker compose -f docker-compose.dev.yml logs -f

logs-api:
	docker compose -f docker-compose.dev.yml logs -f api

logs-ui:
	docker compose -f docker-compose.dev.yml logs -f ui

# Database shell
db-shell:
	docker compose -f docker-compose.dev.yml exec db psql -U lektr -d lektr

# Production build
prod:
	DOCKER_BUILDKIT=1 docker compose up --build

prod-stop:
	docker compose down

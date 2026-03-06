# Makefile for SEO Backlink Trello Project

-include .env

.PHONY: dev clean kill setup firestore backend ui

# Ports to clean up
UI_PORT=5173
BACKEND_PORT=8080
EMULATOR_PORT=8081
EMULATOR_UI_PORT=4002

# Local Dev Configuration

dev: kill
	@echo "🚀 Starting Full Stack Development Environment..."
	@$(MAKE) -j 3 firestore backend ui

firestore:
	@echo "🔥 Starting Firestore Emulator..."
	firebase emulators:start --project $(PROJECT_ID) --import=./firebase-export --export-on-exit=./firebase-export

backend:
	@echo "📦 Starting Go Backend..."
	go run ./cmd/server/main.go

ui:
	@echo "🌐 Starting UI (Vite)..."
	cd ui && npm run dev

kill:
	@echo "🧹 Cleaning up existing processes on dev ports..."
	-@lsof -t -i:$(UI_PORT) | xargs kill 2>/dev/null || true
	-@lsof -t -i:$(BACKEND_PORT) | xargs kill 2>/dev/null || true
	-@lsof -t -i:$(EMULATOR_PORT) | xargs kill 2>/dev/null || true
	-@lsof -t -i:$(EMULATOR_UI_PORT) | xargs kill 2>/dev/null || true
	@sleep 1
	@echo "✨ Ports cleared."

clean: kill
	@echo "🗑️ Removing local cache..."
	rm -rf .cache
	@echo "Done."

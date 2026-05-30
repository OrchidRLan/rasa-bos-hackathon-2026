VENV   := .venv
PYTHON := ./$(VENV)/bin/python
RASA   := $(PYTHON) -m rasa
UV     := $(shell which uv)

ifneq (,$(wildcard .env))
    include .env
    export
endif

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo 'HuddleX Backend'
	@echo ''
	@echo 'Setup:'
	@echo '  make install         Install all Python deps into .venv'
	@echo '  make seed-personas   Fetch Wikipedia + embed personas into Chroma'
	@echo '  make train           Train Rasa CALM model'
	@echo ''
	@echo 'Run (4 terminals):'
	@echo '  make run-actions     Tab 1 — Rasa action server (:5055)'
	@echo '  make run-api         Tab 2 — FastAPI REST server (:8080)'
	@echo '  make run-rasa        Tab 3 — Rasa CALM server (:5005)'
	@echo '  make demo-text       Tab 4 — text chat CLI (no audio needed)'
	@echo ''
	@echo 'Util:'
	@echo '  make verify          Pre-flight checks'
	@echo '  make clean           Remove models, caches, .data/'

.PHONY: install
install:
	$(UV) venv --allow-existing $(VENV)
	$(UV) pip install pip setuptools wheel packaging
	$(UV) pip install -e ".[voice]"

.PHONY: seed-personas
seed-personas:
	$(PYTHON) scripts/seed_personas.py

.PHONY: train
train:
	$(RASA) train

.PHONY: run-actions
run-actions:
	$(RASA) run actions

.PHONY: run-api
# Frontend calls: GET /api/experts, GET /api/user, GET/POST /api/threads
run-api:
	$(PYTHON) -m uvicorn actions.api_server:app --host 0.0.0.0 --port 8080 --reload

.PHONY: run-rasa
# Frontend calls: POST /webhooks/rest/webhook  (chat + persona switching)
run-rasa:
	$(RASA) run --enable-api --cors "*"

.PHONY: demo-text
demo-text:
	$(PYTHON) -m voice.demo --text

.PHONY: verify
verify:
	$(PYTHON) scripts/verify_setup.py

.PHONY: clean
clean:
	rm -rf .rasa models results
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

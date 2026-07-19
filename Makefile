.PHONY: build up down logs clean package

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-core:
	docker-compose logs -f core-engine

logs-intel:
	docker-compose logs -f intelligence-api

logs-celery:
	docker-compose logs -f celery-worker celery-beat

restart:
	docker-compose restart

restart-core:
	docker-compose restart core-engine

restart-intel:
	docker-compose restart intelligence-api

shell-core:
	docker-compose exec core-engine /bin/sh

shell-intel:
	docker-compose exec intelligence-api /bin/sh

shell-db:
	docker-compose exec postgres psql -U postgres -d systemone

add-user:
	@read -p "Enter username: \" username; \
	docker-compose exec core-engine python -c "from app.services.auth import auth_service; import getpass; pw = getpass.getpass(); auth_service.add_user('$$username', pw)"

clean:
	docker-compose down -v
	docker system prune -f

package:
	@echo "Packaging SystemOne..."
	@mkdir -p Packaged/releases
	@VERSION=$$(date +%Y%m%d-%H%M%S); \
	docker save systemone-core-engine systemone-intelligence systemone-webui | gzip > Packaged/releases/systemone-$$VERSION.tar.gz; \
	sha256sum Packaged/releases/systemone-$$VERSION.tar.gz > Packaged/releases/systemone-$$VERSION.sha256; \
	echo "Package created: Packaged/releases/systemone-$$VERSION.tar.gz"

health:
	@curl -s http://localhost:8001/health | python -m json.tool
	@curl -s http://localhost:8002/health | python -m json.tool

# Seed deterministic QA test data (issue #16) into the running stack
seed:
	docker-compose exec core-engine python -m app.scripts.seed_test_data

seed-dry:
	docker-compose exec core-engine python -m app.scripts.seed_test_data --dry-run

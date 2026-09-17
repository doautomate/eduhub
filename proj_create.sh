#!/usr/bin/env bash

set -e

echo "Creating enterprise monorepo structure..."

create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "DIR  + $1"
    fi
}

create_file() {
    if [ ! -f "$1" ]; then
        mkdir -p "$(dirname "$1")"
        touch "$1"
        echo "FILE + $1"
    fi
}

###############################################################################
# ROOT
###############################################################################

create_file "README.md"
create_file "LICENSE"
create_file ".gitignore"
create_file ".editorconfig"
create_file ".env"
create_file ".env.example"
create_file ".env.development"
create_file ".env.production"
create_file "docker-compose.yml"
create_file "docker-compose.dev.yml"
create_file "docker-compose.prod.yml"
create_file "Makefile"
create_file "pnpm-workspace.yaml"
create_file ".pre-commit-config.yaml"

###############################################################################
# BACKEND
###############################################################################

create_dir "backend/src"

create_file "backend/src/__init__.py"
create_file "backend/src/main.py"

# Core
create_dir "backend/src/core"

create_file "backend/src/core/__init__.py"
create_file "backend/src/core/config.py"
create_file "backend/src/core/logging.py"
create_file "backend/src/core/security.py"
create_file "backend/src/core/exceptions.py"
create_file "backend/src/core/cache.py"
create_file "backend/src/core/telemetry.py"
create_file "backend/src/core/settings.py"

# API
create_dir "backend/src/api/v1/endpoints"
create_dir "backend/src/api/v2/endpoints"

create_file "backend/src/api/__init__.py"
create_file "backend/src/api/deps.py"

create_file "backend/src/api/v1/__init__.py"
create_file "backend/src/api/v1/api.py"

create_file "backend/src/api/v1/endpoints/__init__.py"
create_file "backend/src/api/v1/endpoints/health.py"
create_file "backend/src/api/v1/endpoints/users.py"
create_file "backend/src/api/v1/endpoints/items.py"
create_file "backend/src/api/v1/endpoints/auth.py"
create_file "backend/src/api/v1/endpoints/roles.py"

create_file "backend/src/api/v2/__init__.py"
create_file "backend/src/api/v2/api.py"

# Schemas
create_dir "backend/src/schemas"

create_file "backend/src/schemas/__init__.py"
create_file "backend/src/schemas/common.py"
create_file "backend/src/schemas/user.py"
create_file "backend/src/schemas/item.py"
create_file "backend/src/schemas/auth.py"
create_file "backend/src/schemas/pagination.py"

# Models
create_dir "backend/src/models"

create_file "backend/src/models/__init__.py"
create_file "backend/src/models/user.py"
create_file "backend/src/models/item.py"
create_file "backend/src/models/role.py"
create_file "backend/src/models/audit.py"

# Services
create_dir "backend/src/services"

create_file "backend/src/services/__init__.py"
create_file "backend/src/services/user_service.py"
create_file "backend/src/services/item_service.py"
create_file "backend/src/services/auth_service.py"
create_file "backend/src/services/notification_service.py"

# Repositories
create_dir "backend/src/repositories"

create_file "backend/src/repositories/__init__.py"
create_file "backend/src/repositories/user_repository.py"
create_file "backend/src/repositories/item_repository.py"

# DB
create_dir "backend/src/db"

create_file "backend/src/db/__init__.py"
create_file "backend/src/db/base.py"
create_file "backend/src/db/session.py"
create_file "backend/src/db/seed.py"

# Middleware
create_dir "backend/src/middleware"

create_file "backend/src/middleware/__init__.py"
create_file "backend/src/middleware/correlation_id.py"
create_file "backend/src/middleware/request_logger.py"
create_file "backend/src/middleware/auth_middleware.py"

# Utils
create_dir "backend/src/util"

create_file "backend/src/util/__init__.py"
create_file "backend/src/util/response.py"
create_file "backend/src/util/pagination.py"
create_file "backend/src/util/singleton.py"
create_file "backend/src/util/datetime_utils.py"
create_file "backend/src/util/validators.py"

# Tasks
create_dir "backend/src/tasks"

create_file "backend/src/tasks/__init__.py"
create_file "backend/src/tasks/email_tasks.py"
create_file "backend/src/tasks/background_jobs.py"

# Events
create_dir "backend/src/events"

create_file "backend/src/events/__init__.py"
create_file "backend/src/events/publishers.py"
create_file "backend/src/events/consumers.py"

# Tests
create_dir "backend/tests/unit"
create_dir "backend/tests/integration"
create_dir "backend/tests/e2e"

create_file "backend/tests/conftest.py"

# Alembic
create_dir "backend/alembic/versions"

create_file "backend/alembic/env.py"
create_file "backend/alembic/script.py.mako"

create_file "backend/Dockerfile"
create_file "backend/pyproject.toml"
create_file "backend/requirements.txt"
create_file "backend/.env.example"

###############################################################################
# FRONTEND
###############################################################################

create_dir "frontend/src"

create_file "frontend/src/main.tsx"
create_file "frontend/src/App.tsx"

# Core
create_dir "frontend/src/core/auth"
create_dir "frontend/src/core/config"
create_dir "frontend/src/core/logging"
create_dir "frontend/src/core/permissions"
create_dir "frontend/src/core/exceptions"

# API
create_dir "frontend/src/api/v1"
create_dir "frontend/src/api/v2"

create_file "frontend/src/api/client.ts"
create_file "frontend/src/api/interceptor.ts"

create_file "frontend/src/api/v1/users.ts"
create_file "frontend/src/api/v1/items.ts"
create_file "frontend/src/api/v1/auth.ts"
create_file "frontend/src/api/v1/health.ts"

# Schemas
create_dir "frontend/src/schemas"

create_file "frontend/src/schemas/user.schema.ts"
create_file "frontend/src/schemas/item.schema.ts"
create_file "frontend/src/schemas/auth.schema.ts"
create_file "frontend/src/schemas/common.schema.ts"

# Types
create_dir "frontend/src/types"

create_file "frontend/src/types/user.ts"
create_file "frontend/src/types/item.ts"
create_file "frontend/src/types/auth.ts"
create_file "frontend/src/types/common.ts"

# Services
create_dir "frontend/src/services"

create_file "frontend/src/services/userService.ts"
create_file "frontend/src/services/itemService.ts"
create_file "frontend/src/services/authService.ts"

# Store
create_dir "frontend/src/store/slices"
create_dir "frontend/src/store/middleware"

create_file "frontend/src/store/index.ts"

# Hooks
create_dir "frontend/src/hooks"

create_file "frontend/src/hooks/useAuth.ts"
create_file "frontend/src/hooks/useApi.ts"
create_file "frontend/src/hooks/usePagination.ts"

# Features
create_dir "frontend/src/features/dashboard/pages"
create_dir "frontend/src/features/dashboard/components"
create_dir "frontend/src/features/dashboard/services"
create_dir "frontend/src/features/dashboard/hooks"

create_dir "frontend/src/features/users/pages"
create_dir "frontend/src/features/users/components"
create_dir "frontend/src/features/users/services"
create_dir "frontend/src/features/users/hooks"
create_dir "frontend/src/features/users/types"

create_dir "frontend/src/features/items/pages"
create_dir "frontend/src/features/items/components"
create_dir "frontend/src/features/items/services"
create_dir "frontend/src/features/items/hooks"

create_dir "frontend/src/features/administration/pages"
create_dir "frontend/src/features/administration/components"
create_dir "frontend/src/features/administration/services"
create_dir "frontend/src/features/administration/hooks"

# Components
create_dir "frontend/src/components/common/Button"
create_dir "frontend/src/components/common/Modal"
create_dir "frontend/src/components/common/Card"
create_dir "frontend/src/components/common/Table"
create_dir "frontend/src/components/common/Pagination"
create_dir "frontend/src/components/common/Loader"

create_dir "frontend/src/components/navigation"
create_dir "frontend/src/components/layouts"

# Pages
create_dir "frontend/src/pages"

create_file "frontend/src/pages/Login.tsx"
create_file "frontend/src/pages/Home.tsx"
create_file "frontend/src/pages/NotFound.tsx"
create_file "frontend/src/pages/Unauthorized.tsx"

# Router
create_dir "frontend/src/router"

create_file "frontend/src/router/routes.tsx"
create_file "frontend/src/router/ProtectedRoute.tsx"

# Middleware
create_dir "frontend/src/middleware"

create_file "frontend/src/middleware/auth.ts"
create_file "frontend/src/middleware/request.ts"

# Utils
create_dir "frontend/src/util"

create_file "frontend/src/util/response.ts"
create_file "frontend/src/util/dateUtils.ts"
create_file "frontend/src/util/storage.ts"
create_file "frontend/src/util/validations.ts"

# Styles
create_dir "frontend/src/styles"

create_file "frontend/src/styles/globals.css"
create_file "frontend/src/styles/theme.css"
create_file "frontend/src/styles/variables.css"
create_file "frontend/src/styles/typography.css"

# Assets
create_dir "frontend/src/assets/images"
create_dir "frontend/src/assets/icons"
create_dir "frontend/src/assets/fonts"

# Tests
create_dir "frontend/tests/unit"
create_dir "frontend/tests/integration"
create_dir "frontend/tests/e2e"
create_dir "frontend/tests/fixtures"
create_dir "frontend/tests/mocks"

create_file "frontend/tests/setupTests.ts"
create_file "frontend/tests/test-utils.tsx"

create_dir "frontend/public"

create_file "frontend/package.json"
create_file "frontend/tsconfig.json"
create_file "frontend/vite.config.ts"
create_file "frontend/eslint.config.js"
create_file "frontend/prettier.config.js"
create_file "frontend/Dockerfile"
create_file "frontend/nginx.conf"
create_file "frontend/.env.example"

###############################################################################
# SHARED PACKAGES
###############################################################################

create_dir "packages/shared-types/src"
create_dir "packages/ui-kit/src"
create_dir "packages/api-contracts/openapi"
create_dir "packages/api-contracts/generated"

create_file "packages/shared-types/package.json"
create_file "packages/shared-types/tsconfig.json"

create_file "packages/shared-types/src/user.ts"
create_file "packages/shared-types/src/item.ts"
create_file "packages/shared-types/src/auth.ts"
create_file "packages/shared-types/src/common.ts"

create_file "packages/ui-kit/package.json"
create_file "packages/ui-kit/tsconfig.json"

create_file "packages/api-contracts/package.json"

###############################################################################
# INFRASTRUCTURE
###############################################################################

create_dir "infrastructure/docker/backend"
create_dir "infrastructure/docker/frontend"

create_dir "infrastructure/kubernetes/backend"
create_dir "infrastructure/kubernetes/frontend"
create_dir "infrastructure/kubernetes/postgres"
create_dir "infrastructure/kubernetes/redis"
create_dir "infrastructure/kubernetes/ingress"

create_dir "infrastructure/terraform/environments"
create_dir "infrastructure/terraform/modules"

create_dir "infrastructure/monitoring/grafana"
create_dir "infrastructure/monitoring/dashboards"

create_file "infrastructure/monitoring/prometheus.yml"

create_dir "infrastructure/nginx/ssl"
create_file "infrastructure/nginx/nginx.conf"

###############################################################################
# DOCS
###############################################################################

create_dir "docs/architecture"
create_dir "docs/api"
create_dir "docs/backend"
create_dir "docs/frontend"
create_dir "docs/deployment"
create_dir "docs/adr"

###############################################################################
# GITHUB
###############################################################################

create_dir ".github/workflows"

create_file ".github/workflows/backend-ci.yml"
create_file ".github/workflows/frontend-ci.yml"
create_file ".github/workflows/security-scan.yml"
create_file ".github/workflows/release.yml"
create_file ".github/workflows/deploy.yml"

create_file ".github/CODEOWNERS"
create_file ".github/pull_request_template.md"
create_file ".github/dependabot.yml"

###############################################################################
# VSCODE
###############################################################################

create_dir ".vscode"

create_file ".vscode/settings.json"
create_file ".vscode/launch.json"
create_file ".vscode/extensions.json"

echo ""
echo "✅ Enterprise monorepo structure created successfully."
echo "✅ Existing files were preserved."
echo "✅ Missing files and directories were created."

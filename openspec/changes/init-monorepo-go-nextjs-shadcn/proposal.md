## Why

Репозиторий `digital-library` сейчас пуст: нет кода, нет git-истории, только служебные конфиги IDE и MCP. Чтобы начать разработку цифровой библиотеки, нужен работающий каркас монорепозитория с backend (Go) и frontend (Next.js + shadcn/ui), связанными между собой, прежде чем добавлять доменную логику, БД и аутентификацию отдельными change.

## What Changes

**Инициализация репозитория**
- From: нет git-репозитория, каталог пуст.
- To: `git init`, `.gitignore` обновлён (`node_modules`, `.next`, backend-бинарник, `.env*`), один коммит со скелетом монорепо.
- Reason: зафиксировать стартовую точку истории проекта.
- Impact: non-breaking, единоразовая настройка.

**Backend-каркас**
- From: backend отсутствует.
- To: Go-модуль в `backend/`, HTTP-сервер на `chi`, эндпоинт `GET /healthz`, middleware (логирование, recovery, request ID, CORS), конфиг порта через `PORT`.
- Reason: дать фронтенду и будущим доменным сервисам API-слой для подключения.
- Impact: non-breaking, новый сервис.

**Frontend-каркас**
- From: frontend отсутствует.
- To: Next.js (App Router, TypeScript, Tailwind) в `frontend/`, `shadcn/ui` инициализирован (`button`, `card`), главная страница показывает статус backend через `GET /healthz`.
- Reason: дать UI-слой и подтвердить, что backend/frontend связаны сквозным примером.
- Impact: non-breaking, новый сервис.

**Dev-оркестрация**
- From: нет способа поднять оба сервиса.
- To: корневой `Makefile` (`dev`, `backend`, `frontend`, `lint`, `test`) и `README.md` с инструкциями.
- Reason: единая команда для локальной разработки обоих сервисов.
- Impact: non-breaking.

## Capabilities

### New Capabilities
- `backend-scaffold`: Go-сервис на `chi` с health-check эндпоинтом, конфигом и тестами — базовый API-слой для будущей доменной логики.
- `frontend-scaffold`: Next.js-приложение с `shadcn/ui`, обращающееся к backend через `/healthz` и отображающее его статус.
- `monorepo-tooling`: git-инициализация, корневой `Makefile` и `README.md`, связывающие оба сервиса в единый dev-workflow.

### Modified Capabilities
<!-- нет: репозиторий пуст, изменять нечего -->

## Impact

- **Новый код**: `backend/` (Go-модуль, `cmd/server`, `internal/`), `frontend/` (Next.js-приложение).
- **Новые зависимости**: Go — `chi`; Node — Next.js, React, Tailwind, `shadcn/ui`, pnpm как менеджер пакетов.
- **Новая инфраструктура репозитория**: git-история, корневой `Makefile`, `README.md`, обновлённый `.gitignore`.
- **Явно вне scope**: персистентность/миграции, аутентификация, CI-пайплайн, доменная логика библиотеки (каталог, книги и т.п.) — отдельные будущие change.

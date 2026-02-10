# taxi-vroom-api
## Prerequisites

- [Node.js](https://nodejs.org/) v20.1.0 (managed via [Volta](https://volta.sh/))
- [Docker](https://www.docker.com/) and Docker Compose

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and adjust if needed:

```bash
cp .env.example .env
```

Default values:

| Variable      | Value       |
|---------------|-------------|
| `DB_HOST`     | `localhost` |
| `DB_PORT`     | `5432`      |
| `DB_USERNAME` | `user`      |
| `DB_PASSWORD` | `password`  |
| `DB_NAME`     | `ddh`       |

### 3. Start the infrastructure

Launch PostgreSQL and pgAdmin via Docker:

```bash
npm run docker:env
```

To run in detached mode (background):

```bash
docker-compose --file docker/docker-compose.yml up --build -d
```

- **PostgreSQL** is available on port `5432`
- **pgAdmin** is available at [http://localhost:5050](http://localhost:5050) (login: `admin@email.com` / `admin`)

### 4. Run database migrations

```bash
npm run migration:up
```

### 5. Start the application

Development mode (with hot-reload):

```bash
npm run start:dev
```

Debug mode:

```bash
npm run start:debug
```

Production mode:

```bash
npm run build
npm run start:prod
```

## Available Scripts

| Script                   | Description                              |
|--------------------------|------------------------------------------|
| `npm run start:dev`      | Start in watch mode (hot-reload)         |
| `npm run start:debug`    | Start in debug mode with watch           |
| `npm run start:prod`     | Start from compiled `dist/`              |
| `npm run build`          | Build the project                        |
| `npm run docker:env`     | Start PostgreSQL and pgAdmin via Docker  |
| `npm run migration:up`   | Run pending migrations                   |
| `npm run migration:down` | Revert last migration                    |
| `npm run seed:up`        | Seed the database                        |
| `npm run test`           | Run unit tests                           |
| `npm run test:e2e`       | Run end-to-end tests                     |
| `npm run test:cov`       | Run tests with coverage                  |
| `npm run lint`           | Lint and auto-fix source files           |
| `npm run format`         | Format source files with Prettier        |
| `npm run deps:validate`  | Validate dependency rules                |
| `npm run deps:graph`     | Generate dependency graph (SVG)          |

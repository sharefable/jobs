# Fable Jobs Service

[![Version](https://img.shields.io/badge/version-2.0.16-blue.svg)](https://github.com/sharefable/sqs_jobs)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18.16.1-brightgreen.svg)](https://nodejs.org)

Event-driven job processor and HTTP API server for the Fable interactive demo platform. Handles AI-powered demo generation, media transcoding, analytics processing, and third-party integrations.

## What is This?

The **Fable Jobs Service** is a critical backend microservice that powers the Fable interactive demo product through a dual-mode architecture:

### SQS Message Consumer
Continuously polls AWS SQS queues to process asynchronous jobs:
- **AI-Powered Demo Generation** - Uses Claude AI to create interactive product demos, generate themes, and extract metadata
- **Media Transcoding** - Converts video and audio files using AWS Elastic Transcoder
- **Analytics Processing** - Executes scheduled data warehouse jobs against PostgreSQL
- **Third-Party Integrations** - Syncs data to Cobalt CRM, Mailchimp, SmartLead, and custom webhooks

### HTTP API Server (Port 8081)
Provides REST endpoints for:
- **LLM Operations** (`/v1/f/llmops`) - Real-time Claude AI interactions for demo creation and updates
- **Audio Generation** (`/v1/f/aud/gen`) - OpenAI text-to-speech for voice-overs
- **Slack Notifications** (`/v1/f/slack/*`) - Demo announcements and webhooks
- **Health Checks** (`/health`) - Service monitoring

## Architecture Overview

```
┌─────────────────────────────────────────┐
│     SQS Job Queue Message Loop          │
│   (polls every 15s, 5 concurrent)       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┬─────────────┬─────────────┐
       │               │             │             │
   ┌───▼─────────┐ ┌───▼──────┐ ┌────▼────────┐ ┌──▼────────┐
   │  Media      │ │ Analytics│ │  Event      │ │ Webhooks  │
   │ Transcoding │ │  Jobs    │ │ Routing &   │ │ & Third   │
   │ (AWS ETS)   │ │ (PG DB)  │ │ Integrations│ │ Party API │
   └─────────────┘ └──────────┘ └─────────────┘ └───────────┘

        HTTP Server (Express.js)
   ┌─────────────────────────────────────┐
   │  Port 8081 - REST API               │
   ├─────────────────────────────────────┤
   │ • /v1/f/llmops      (LLM ops)       │
   │ • /v1/f/aud/gen     (Audio gen)     │
   │ • /v1/f/slack/*     (Slack hooks)   │
   │ • /health           (Health check)  │
   └─────────────────────────────────────┘
```

### Key Components

- **`src/main_msg_loop.ts`** - Core SQS polling loop with retry logic and message routing
- **`src/http/llm-ops/`** - Claude AI integration for 7 LLM operation types (demo creation, theming, metadata extraction, content updates)
- **`src/processors/`** - Message handlers for media, integrations, events, and subscription lifecycle
- **`src/analytics/`** - Analytics job execution against PostgreSQL data warehouse
- **`src/json-schema/`** - TypeScript definitions that generate JSON schemas for LLM function tools
- **`src/middlewares/`** - Express middleware for Auth0 JWT verification, error handling, and logging

### Supported Message Types

| Message Type | Handler | Purpose |
|-------------|---------|---------|
| `TRANSCODE_VIDEO` | `media/video_transcoder.ts` | Convert video formats via AWS Elastic Transcoder |
| `TRANSCODE_AUDIO` | `media/audio_transcoder.ts` | Convert audio formats |
| `NF` | `mics.ts` | Event routing (signup, integrations, etc.) |
| `CBE` | `cobalt.ts` | Send lead data to Cobalt CRM |
| `SUBS_UPGRADE_DOWNGRADE_SIDE_EFFECT` | `upgrade-downgrade-sideffect.ts` | Handle subscription tier changes |
| `TRIGGER_ANALYTICS_JOB` | `analytics/event_router.ts` | Execute analytics queries and materialized view refreshes |

## Prerequisites

### Runtime & Dependencies
- **Node.js** 18.16.1 or higher
- **npm** 9.x or higher

### Databases
- **MySQL** 8.0+ (operational data: jobs, demos, integrations)
- **PostgreSQL** 12+ (analytics data warehouse)

### AWS Services
- **SQS** - Message queue (ap-south-1 region)
- **S3** - Asset storage (images, audio, demos)
- **Elastic Transcoder** - Video/audio encoding
- **Glue** - Data cataloging (for analytics)(legacy, now deprecated)
- **Athena** - Analytics queries (legacy, now deprecated)

### Third-Party API Keys
- **Anthropic** - Claude API for AI-powered demo generation
- **OpenAI** - Text-to-speech for voice-overs
- **Cobalt** (optional) - CRM integration
- **Mailchimp** (optional) - Email marketing
- **SmartLead** (optional) - Lead management
- **Slack** (optional) - Notifications
- **Auth0** - OAuth2 JWT authentication

## Installation & Setup

### 1. Clone the Repository

```bash
git clone git@github.com:sharefable/sqs_jobs.git
cd sqs_jobs
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following configuration:

#### SQS Configuration
```bash
SQS_Q_NAME=your-queue-name
SQS_Q_REGION=ap-south-1
```

#### Database Configuration
```bash
# MySQL (Operational Database)
DB_CONN_URL=mysql-host:3306
DB_USER=your-mysql-user
DB_PWD=your-mysql-password
DB_DB=your-database-name

# PostgreSQL (Analytics Database)
ANALYTICS_DB_CONN_URL=postgres-host:5432
ANALYTICS_DB_USER=your-postgres-user
ANALYTICS_DB_PWD=your-postgres-password
ANALYTICS_DB_NAME=analytics
```

#### AWS Configuration
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_REGION=ap-south-1
AWS_ASSET_FILE_S3_BUCKET=your-s3-bucket
AWS_ASSET_FILE_S3_BUCKET_REGION=ap-south-1

# Elastic Transcoder
ETS_REGION=ap-south-1
TRANSCODER_PIPELINE_ID=your-pipeline-id
```

#### AI/LLM Configuration
```bash
ANTHORIPC_KEY=your-anthropic-api-key
OPENAI_KEY=your-openai-api-key
```

#### Third-Party Integrations (Optional)
```bash
MAILCHIMP_API_KEY=your-mailchimp-key
MAILCHIP_SERVER_PREFIX=us1
COBALT_API_KEY=your-cobalt-key
SMART_LEAD_API_KEY=your-smartlead-key
SLACK_FABLE_BOT_BOT_USER_TOKEN=xoxb-your-slack-token
```

#### API & Authentication
```bash
API_SERVER_ENDPOINT=https://your-api-server.com
AUTH0_AUDIENCES=https://your-auth0-audience
AUTH0_ISSUER_URL=https://your-tenant.auth0.com/
```

#### Runtime Environment
```bash
APP_ENV=dev  # Options: dev, staging, prod
```

### 4. Generate JSON Schemas

The service uses TypeScript definitions to generate JSON schemas for LLM function tools: (check Makefile for details)

```bash
make gen
```

This reads files from `src/json-schema/*.ts` and generates corresponding `.json` files used by Claude AI. (check Makefile for details)

### 5. Build and run the Project

```bash
make run
```

### 6. Database Setup

Ensure your MySQL and PostgreSQL databases are accessible and have the necessary schemas. The service expects:

- **MySQL**: Tables for jobs, tours, integrations, LLM runs
- **PostgreSQL**: Materialized views for analytics (entity metrics, daily metrics)

By running migration of api server, you can also setup the database.

## Running Locally

### Development Mode (with auto-reload)

```bash
npm run watch-ts    # Terminal 1: Watch TypeScript files
npm run start       # Terminal 2: Start the service
```

### Production Mode

```bash
npm run build
npm run start
```

The service will:
1. Start the HTTP server on port **8081**
2. Begin polling the SQS queue every **15 seconds**
3. Process up to **5 concurrent messages**
4. Connect to MySQL and PostgreSQL databases

### Testing the Service

```bash
# Health check
curl http://localhost:8081/health

# Should return: {"status":"UP"}
```

## Message Processing

### How It Works

1. **Polling Loop**: Service polls SQS queue every 15 seconds
2. **Message Retrieval**: Fetches up to 5 messages per poll
3. **Concurrent Processing**: Processes messages in parallel (max 5 concurrent)
4. **Retry Logic**: Failed messages retry 3 times with 15-minute intervals
5. **Status Tracking**: Updates job status in MySQL database
6. **Message Deletion**: Successful jobs are removed from queue

### Message Format

The service supports both legacy (string) and modern (JSON) SQS message formats:

**Legacy Format** (string body):
```json
{
  "MessageId": "msg-123",
  "Body": "TRANSCODE_VIDEO|job-id-456|metadata-string"
}
```

**Modern Format** (JSON body):
```json
{
  "MessageId": "msg-123",
  "Body": "{\"type\":\"TRANSCODE_VIDEO\",\"jobId\":\"job-id-456\",\"metadata\":{...}}"
}
```

### Error Handling

- **Retryable Errors**: Network timeouts, 5xx responses - retry with exponential backoff
- **Irrecoverable Errors**: Invalid message format, missing handlers - delete immediately
- **Processing Failures**: Logged to database with error details for debugging

### Adding Custom Message Handlers

1. Create a new processor in `src/processors/your-handler.ts`
2. Export a function matching signature: `(jobId: string, metadata: any) => Promise<void>`
3. Register the handler in `src/main_msg_loop.ts` by adding to the message type router

## Deployment

### Docker Build

The service uses a multi-stage Dockerfile optimized for production. Don't run docker build directly, use Makefile command instead.

```bash
# Build the Docker image
make containerize v=2.0.16

# Run the container
make container-run
```

### GitHub Actions Workflow

The repository includes a CI/CD pipeline (`.github/workflows/main.yml`) that:

1. Triggers on manual workflow dispatch with environment selection (dev/staging/prod)
2. Extracts version from `package.json`
3. Requests manual approval before deployment
4. Checks if ECR image already exists
5. Builds and pushes Docker image to AWS ECR (ap-southeast-1)
6. Tags image with version number from package.json

**Note**: ECS deployment is manual - update your ECS task definition to use the new image.

### Deployment Steps

1. Update version in `package.json`
2. Commit and push changes to `develop` branch
3. Trigger GitHub Actions workflow with target environment
4. Approve the deployment request
5. Wait for Docker image to be pushed to ECR
6. Update ECS task definition with new image tag
7. Deploy to ECS cluster

## Configuration Reference

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SQS_Q_NAME` | AWS SQS queue name | `fable-jobs-prod` |
| `SQS_Q_REGION` | AWS region for SQS | `ap-south-1` |
| `DB_CONN_URL` | MySQL host and port | `mysql.example.com:3306` |
| `DB_USER` | MySQL username | `fable_user` |
| `DB_PWD` | MySQL password | `secure_password` |
| `DB_DB` | MySQL database name | `fable_prod` |
| `ANALYTICS_DB_CONN_URL` | PostgreSQL host and port | `postgres.example.com:5432` |
| `ANALYTICS_DB_USER` | PostgreSQL username | `analytics_user` |
| `ANALYTICS_DB_PWD` | PostgreSQL password | `secure_password` |
| `ANALYTICS_DB_NAME` | PostgreSQL database name | `analytics` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `AWS_S3_REGION` | S3 bucket region | `ap-south-1` |
| `AWS_ASSET_FILE_S3_BUCKET` | S3 bucket for assets | `fable-assets-prod` |
| `AWS_ASSET_FILE_S3_BUCKET_REGION` | Asset bucket region | `ap-south-1` |
| `ETS_REGION` | Elastic Transcoder region | `ap-south-1` |
| `TRANSCODER_PIPELINE_ID` | ETS pipeline ID | `1234567890123-abcdef` |
| `ANTHORIPC_KEY` | Anthropic API key | `sk-ant-...` |
| `OPENAI_KEY` | OpenAI API key | `sk-...` |
| `API_SERVER_ENDPOINT` | Main API server URL | `https://api.fable.com` |
| `AUTH0_AUDIENCES` | Auth0 API audience | `https://api.fable.com` |
| `AUTH0_ISSUER_URL` | Auth0 tenant URL | `https://fable.auth0.com/` |
| `APP_ENV` | Runtime environment | `prod` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MAILCHIMP_API_KEY` | Mailchimp API key | - |
| `MAILCHIP_SERVER_PREFIX` | Mailchimp server prefix | `us1` |
| `COBALT_API_KEY` | Cobalt CRM API key | - |
| `SMART_LEAD_API_KEY` | SmartLead API key | - |
| `SLACK_FABLE_BOT_BOT_USER_TOKEN` | Slack bot token | - |

### Database Connection Pooling

The service uses connection pooling to optimize database performance:

- **MySQL**: Max 5 concurrent connections
- **PostgreSQL**: Max 5 concurrent connections

## Integration Points

### Inbound Integrations

| System | Purpose | Authentication |
|--------|---------|----------------|
| **Main API Server** | Fetches tour data, manages LLM runs, logs events | Internal API |
| **Auth0** | OAuth2 JWT token verification for HTTP endpoints | JWT Bearer |
| **AWS SQS** | Job queue for async message processing | AWS IAM |

### Outbound Integrations

#### AI & Machine Learning
- **Anthropic Claude API** - Demo generation, metadata extraction, content updates
  - Model: `claude-3-5-sonnet-20240620`
  - Features: Prompt caching, multi-account fallback, function calling
- **OpenAI API** - Text-to-speech for voice-overs
  - Voices: alloy, echo, fable, onyx, nova, shimmer

#### AWS Services
- **SQS** - Message queue consumption
- **S3** - Asset storage (images, audio files, demo exports)
- **Elastic Transcoder** - Video and audio format conversion
- **Glue** - Data catalog for analytics
- **Athena** - SQL queries against S3 data

#### Third-Party Services
- **Cobalt** - CRM integration for lead/contact sync and engagement tracking
- **Mailchimp** - Email contact management and audience sync
- **SmartLead** - Lead database integration
- **Slack** - Demo announcements and notifications
- **Custom Webhooks** - Generic webhook system with Handlebars templating

#### Database Connections
- **MySQL** - Transactional operations (jobs, demos, tours, integrations)
- **PostgreSQL** - Analytics and reporting (materialized views, metrics aggregation)


## Technology Stack

### Runtime & Language
- **Node.js** 18.16.1
- **TypeScript** 5.1.3
- **Express.js** 4.18 (HTTP server)

### Cloud & Infrastructure
- **AWS SQS** - Message queue
- **AWS S3** - Object storage
- **AWS Elastic Transcoder** - Media encoding
- **AWS Glue** - Data catalog (deprecated)
- **AWS Athena** - Analytics queries (deprecated)

### Databases
- **MySQL** 8+ (via `mysql` driver)
- **PostgreSQL** 12+ (via `pg` driver)

### AI & Machine Learning
- **Anthropic Claude** (`@anthropic-ai/sdk` ^0.27.1)
- **OpenAI** (`openai` ^4.67.3)

## JSON Schema Generation

The `src/json-schema/` directory contains TypeScript definitions that power Claude AI's function calling:

1. **Define in TypeScript**: Create type definitions in `src/json-schema/*.ts`
2. **Generate JSON**: Run `npm run gen` to produce JSON Schema files
3. **Used by LLM**: Claude receives these schemas as function tool definitions
4. **Shared with Frontend**: Schemas are copied to the main app repository for response parsing

**Important**: Never edit `.json` files directly - always modify the TypeScript source files.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support & Resources

### Related Repositories
This service is part of the Fable platform ecosystem:
- **Main Application** - Web application and client-side code
- **API Server** - Primary REST API
- **Jobs Service** (this repository) - Event-driven job processor

### Getting Help

If you encounter issues or have questions:

1. **Check the Logs** - Review application logs for error details
2. **Environment Variables** - Verify all required variables are set correctly
3. **Database Connectivity** - Ensure MySQL and PostgreSQL are accessible
4. **AWS Permissions** - Confirm IAM credentials have necessary permissions
5. **Raise an Issue** - [Create an issue](https://github.com/sharefable/sqs_jobs/issues) on GitHub


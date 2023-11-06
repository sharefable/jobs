FROM node:16.13.1 AS base

WORKDIR /usr/sqs_jobs

COPY package*.json ./
RUN npm install
COPY . .

FROM base as builder
WORKDIR /usr/sqs_jobs
RUN npm run tscv
RUN npm run build

FROM node:16.13.1-alpine3.15
WORKDIR /usr/sqs_jobs
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /usr/sqs_jobs ./

EXPOSE 8081
ENTRYPOINT ["yarn","start"]

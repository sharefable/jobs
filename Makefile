.PHONY: run env container-run containerize update-contract

include env.now

update-contract:
	cp -r ../api/gen/api-contract.d.ts ./src/api-contract.ts

run:
	yarn build && yarn start

# --------------------------------------------------------------
# Different env file is required for different tool. Like idea
# needs env file in a different format which could be loaded via
# env plugin. This commands generate those file format.
# This is the first command that needs to be ran
# --------------------------------------------------------------
env:
	@echo "Generating env file"

	@if [ "$(staging)" ]; then \
        cp env.staging env.now; \
        echo "[staging]"; \
    elif [ "$(dev)" ]; then \
        cp env.dev env.now; \
        echo "[dev]"; \
    elif [ "$(prod)" ]; then \
        cp env.prod env.now; \
        echo "[PROD]"; \
    else \
        echo "Not known. Allowed [staging, dev, prod]"; \
    fi

containerize: export SERVICE_NAME=`jq -r '.SERVICE_NAME' service.json`
containerize: export AWS_ORG=`aws sts get-caller-identity --query "Account" --output text`
containerize: export AWS_REGION=ap-southeast-1
containerize: export ECR_IMAGE_TAG=$(AWS_ORG).dkr.ecr.$(AWS_REGION).amazonaws.com/$(SERVICE_NAME):$(v)
containerize:
	@if [ -z "$(v)" ]; then \
        echo "[v]ersion is mandatory. Usage: make containerize v=2.1.0"; \
        false ; \
	fi
	@echo "ECR tag: $(ECR_IMAGE_TAG)"
	docker build -t $(SERVICE_NAME) -t $(ECR_IMAGE_TAG) .
	# aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ORG).dkr.ecr.$(AWS_REGION).amazonaws.com
	# docker push $(ECR_IMAGE_TAG)

# README If you are running this in local make sure in env.dev file
# DB_CONN_URL=host.docker.internal is set otherwise the db won't be reachable via the docker network
container-run: export SERVICE_NAME=`jq -r '.SERVICE_NAME' service.json`
container-run:
	@echo "Generating env file for this run"
	sed -r 's/^export[[:space:]]+//' env.now > env.dkr
	docker rm sqs-jobs; docker run --name sqs-jobs --env-file env.dkr -p 8081:8081 ${SERVICE_NAME}

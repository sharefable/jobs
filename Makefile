.PHONY: run env

include env.now

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

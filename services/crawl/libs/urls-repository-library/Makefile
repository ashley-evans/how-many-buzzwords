build-URLsRepositoryLibraryLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs/node_modules"
	npm ci --production --ignore-scripts
	rsync -avr --no-t ./ "${ARTIFACTS_DIR}/nodejs/node_modules/buzzword-aws-crawl-service-urls-repository-library/" --exclude='Makefile'

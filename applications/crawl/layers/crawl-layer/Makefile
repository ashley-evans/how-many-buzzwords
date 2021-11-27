build-CrawlLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs/node_modules"
	npm ci --production --ignore-scripts
	rsync -avr ./ "${ARTIFACTS_DIR}/nodejs/node_modules/buzzword-aws-crawl-layer/" --exclude='Makefile'

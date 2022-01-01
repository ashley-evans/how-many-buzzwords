build-CrawlCommonLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs/node_modules"
	npm ci --production --ignore-scripts
	rsync -avr ./ "${ARTIFACTS_DIR}/nodejs/node_modules/buzzword-aws-crawl-common/" --exclude='Makefile'

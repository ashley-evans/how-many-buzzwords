build-CrawlNodeDependencyLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs"
	npm ci --production --ignore-scripts
	rsync -avr --no-t ./node_modules/ "${ARTIFACTS_DIR}/nodejs/node_modules/"

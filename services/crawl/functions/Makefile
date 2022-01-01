build-CrawlNodeDependencyLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs"
	npm ci --production --ignore-scripts
	rsync -avr ./node_modules/ "${ARTIFACTS_DIR}/nodejs/node_modules/"

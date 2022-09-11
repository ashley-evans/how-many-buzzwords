build-WebSocketClientLibraryLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs/node_modules"
	npm ci --production --ignore-scripts
	rsync -avr --no-t ./ "${ARTIFACTS_DIR}/nodejs/node_modules/buzzword-aws-keyphrase-service-web-socket-client-library/" --exclude='Makefile'

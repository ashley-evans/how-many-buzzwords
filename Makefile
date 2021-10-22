build-NodeModuleDependencyLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs"
	npm ci --production --ignore-scripts
	cp -r node_modules "${ARTIFACTS_DIR}/nodejs/node_modules/"

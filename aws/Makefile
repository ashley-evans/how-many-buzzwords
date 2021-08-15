build-NodeModuleDependencyLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs"
	npm ci --production
	cp -r node_modules "${ARTIFACTS_DIR}/nodejs/node_modules/"

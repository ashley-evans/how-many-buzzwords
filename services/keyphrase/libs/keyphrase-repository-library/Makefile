build-KeyphraseRepositoryLibraryLayer:
	mkdir -p "${ARTIFACTS_DIR}/nodejs/node_modules"
	npm ci --production --ignore-scripts
	rsync -avr --no-t ./ "${ARTIFACTS_DIR}/nodejs/node_modules/buzzword-keyphrase-keyphrase-repository-library/" --exclude='Makefile'

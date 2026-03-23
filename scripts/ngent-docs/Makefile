.PHONY: lint lint-dry verify

lint:
	bun ./.lint/run.ts fix

lint-dry:
	bun ./.lint/run.ts check

verify:
	$(MAKE) lint-dry
	npm test

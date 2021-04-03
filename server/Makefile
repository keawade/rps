
all: fmt test

run:
	deno run --allow-env --allow-read --allow-net main.ts

test:
	deno test --reload --allow-env --allow-read --allow-net
	deno fmt --check

fmt:
	deno fmt

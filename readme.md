# [![Prodia](https://raw.githubusercontent.com/prodialabs/prodia-js/master/logo.svg)](https://prodia.com)

[![npm version](https://badge.fury.io/js/prodia.svg)](https://badge.fury.io/js/prodia)
[![Validate Formatting & Types](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml/badge.svg)](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml)

Official TypeScript library for Prodia's AI inference API.

- [Get an v1 API Key or v2 Token](https://app.prodia.com/api)
- [v2 API Explorer](https://app.prodia.com/explorer)
- [View Docs + Pricing](https://docs.prodia.com/reference/getting-started)

## Usage

> [!NOTE]
> Requires Node >= 18 or Deno >= 2

```
npm install prodia --save
```

## v2

As of _October 2024_, we require users to have a **Pro+** or **Enterprise** subscription with us to use our v2 API. This is to ensure quality of service. However, we expect to revisit this by EOY and make it available more broadly.

```javascript
import fs from "node:fs/promises";
import { createProdia } from "prodia/v2"; // v2 :)

const prodia = createProdia({
	token: process.env.PRODIA_TOKEN, // grab a token from https://app.prodia.com/api
});

(async () => {
	// run a flux dev generation
	const job = await prodia.job({
		type: "inference.flux.dev.txt2img.v1",
		config: {
			prompt: "puppies in a cloud, 4k",
			steps: 25,
		},
	});

	const image = await job.arrayBuffer();

	await fs.writeFile("puppies.jpg", new Uint8Array(image));

	// open puppies.jpg
})();
```

## v1 Legacy API

```javascript
import { createProdia } from "prodia";

const prodia = createProdia({
	apiKey: "...",
});

(async () => {
	const job = await prodia.generate({
		prompt: "puppies in a cloud, 4k",
	});

	const { imageUrl, status } = await prodia.wait(job);

	// check status and view your image :)
})();
```

## help

Email us at [hello@prodia.com](mailto:hello@prodia.com).

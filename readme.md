# [![Prodia](https://raw.githubusercontent.com/prodialabs/prodia-js/master/logo.svg)](https://prodia.com)

[![npm version](https://badge.fury.io/js/prodia.svg)](https://badge.fury.io/js/prodia)
[![Validate Formatting & Types](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml/badge.svg)](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml)

Official TypeScript client for [Prodia](https://prodia.com)'s AI inference API — fast image generation, image editing, video generation, and more.

- **Zero dependencies** — built on the standard `fetch` and `FormData` APIs
- **Fully typed** — written in TypeScript, ships with type definitions
- **Resilient** — automatic retries with `Retry-After` backoff when capacity is tight

Useful links:

- [Get an API Token](https://app.prodia.com/api)
- [Model Explorer](https://app.prodia.com/explorer) — browse all job types and try them in the browser
- [Documentation + Pricing](https://docs.prodia.com/)

## Installation

```
npm install prodia --save
```

Requires Node.js >= 18, Deno >= 2, Bun, or any runtime with the standard `fetch` API.

## Quickstart

Generate an image and save it to disk:

```javascript
import fs from "node:fs/promises";
import { createProdia } from "prodia/v2";

const prodia = createProdia({
	token: process.env.PRODIA_TOKEN, // create one at https://app.prodia.com/api
});

const job = await prodia.job({
	type: "inference.flux.dev.txt2img.v1",
	config: {
		prompt: "puppies in a cloud, 4k",
	},
});

const image = await job.arrayBuffer();

await fs.writeFile("puppies.jpg", new Uint8Array(image));
```

Every model is a **job type** (e.g. `inference.flux.dev.txt2img.v1`) with its own `config` schema. Browse them all in the [Model Explorer](https://app.prodia.com/explorer), which also generates ready-to-run code for this SDK.

## Usage

### Client Configuration

```javascript
const prodia = createProdia({
	// required: your API token
	token: process.env.PRODIA_TOKEN,

	// optional, with these defaults:
	baseUrl: "https://inference.prodia.com/v2",
	maxErrors: 1, // non-429 error responses tolerated before giving up
	maxRetries: 10, // 429 (capacity) retries before giving up
});
```

### Reading Outputs

`prodia.job()` resolves once the job is complete. The result exposes the job metadata and the output bytes:

```javascript
const job = await prodia.job({
	type: "inference.flux.dev.txt2img.v1",
	config: { prompt: "puppies in a cloud, 4k" },
});

job.job; // job metadata: id, timestamps, metrics

await job.arrayBuffer(); // output as ArrayBuffer
await job.uint8Array(); // output as Uint8Array
await job.formData(); // full multipart response, for jobs with multiple outputs
```

### Output Formats

Images are returned as JPEG by default. Request a different format with the `accept` option:

```javascript
const job = await prodia.job({
	type: "inference.flux.dev.txt2img.v1",
	config: { prompt: "puppies in a cloud, 4k" },
}, {
	accept: "image/png", // or "image/jpeg", "image/webp", "video/mp4", ...
});
```

### Image Inputs

Job types that take images (image-to-image, upscaling, background removal, image-to-video, ...) accept them via the `inputs` option as a `File`, `Blob`, `ArrayBuffer`, or `Uint8Array`:

```javascript
import fs from "node:fs/promises";
import { createProdia } from "prodia/v2";

const prodia = createProdia({
	token: process.env.PRODIA_TOKEN,
});

const image = await fs.readFile("sunny-day.jpg");

const job = await prodia.job({
	type: "inference.flux-2.klein.img2img.v1",
	config: {
		prompt: "rainy landscape, 4k",
	},
}, {
	inputs: [image],
});

await fs.writeFile("rainy-day.jpg", await job.uint8Array());
```

### Video Generation

Video job types work exactly the same way — the output is just an MP4:

```javascript
const job = await prodia.job({
	type: "inference.veo.fast.txt2vid.v1",
	config: {
		prompt: "a sweeping mountain landscape at sunrise",
	},
});

await fs.writeFile("landscape.mp4", await job.uint8Array());
```

### Error Handling

The client retries transient failures automatically. When it gives up, it throws a typed error:

```javascript
import {
	createProdia,
	ProdiaBadResponseError,
	ProdiaCapacityError,
	ProdiaUserError,
} from "prodia/v2";

try {
	const job = await prodia.job({
		type: "inference.flux.dev.txt2img.v1",
		config: { prompt: "puppies in a cloud, 4k", steps: 1000 },
	});
} catch (error) {
	if (error instanceof ProdiaUserError) {
		// invalid job config or type — fix the request, don't retry
	} else if (error instanceof ProdiaCapacityError) {
		// no capacity right now — retry later
	} else if (error instanceof ProdiaBadResponseError) {
		// unexpected response from the API
	}
}
```

| Error                    | Meaning                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `ProdiaUserError`        | The job config was rejected (bad parameter, unknown job type, ...) |
| `ProdiaCapacityError`    | The job couldn't be scheduled after `maxRetries` attempts          |
| `ProdiaBadResponseError` | The API returned an unexpected, non-multipart response             |

## v1 Legacy API

The v1 API is deprecated in favor of v2, but the legacy client remains available:

```javascript
import { createProdia } from "prodia";

const prodia = createProdia({
	apiKey: "...",
});

const job = await prodia.generate({
	prompt: "puppies in a cloud, 4k",
});

const { imageUrl, status } = await prodia.wait(job);
```

## Development

```bash
deno fmt --check # formatting
deno check v2/index.ts # types
PRODIA_TOKEN=... deno test --allow-env --allow-net # live API tests
```

## Help

Email us at [hello@prodia.com](mailto:hello@prodia.com).

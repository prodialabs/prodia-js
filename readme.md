# [![Prodia](https://raw.githubusercontent.com/prodialabs/prodia-js/master/logo.svg)](https://prodia.com)

[![npm version](https://badge.fury.io/js/prodia.svg)](https://badge.fury.io/js/prodia)
[![Validate Formatting & Types](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml/badge.svg)](https://github.com/prodialabs/prodia-js/actions/workflows/validate.yml)

Official TypeScript library for Prodia's AI inference API.

- [Get an API Key](https://app.prodia.com/api)

- [View Docs + Pricing](https://docs.prodia.com/reference/getting-started)

## Usage

```
npm install prodia --save
```

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

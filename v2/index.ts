/*
                     ___
   ___  _______  ___/ (_)__ _
  / _ \/ __/ _ \/ _  / / _ `/
 / .__/_/  \___/\_,_/_/\_,_/
/_/

To ensure an optimal service
quality, we recommend you use
this library as-is. We cannot
guarantee a high quality
experience with a modified
client library.
*/

type JsonObject =
	& { [Key in string]: JsonValue }
	& {
		[Key in string]?: JsonValue | undefined;
	};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/* job and job configuration */

export type ProdiaJob = Record<string, JsonValue>;

export type ProdiaJobOptions = {
	accept?:
		| "application/json"
		| "image/jpeg"
		| "image/png"
		| "image/webp"
		| "multipart/form-data"
		| "video/mp4";
	inputs?: (File | Blob | ArrayBuffer)[];
};

const defaultJobOptions: ProdiaJobOptions = {
	accept: undefined,
};

export type ProdiaJobResponse = {
	job: ProdiaJob;

	// Currently only one output field is expected for all job types.
	//This will return the raw bytes for that output.
	arrayBuffer: () => Promise<ArrayBuffer>;
};

/* client & client configuration*/

export type Prodia = {
	job: (
		params: ProdiaJob,
		options?: Partial<ProdiaJobOptions>,
	) => Promise<ProdiaJobResponse>;
};

export type CreateProdiaOptions = {
	token: string;
	baseUrl?: string;
	maxErrors?: number;
	maxRetries?: number;
};

/* error types */

export class ProdiaUserError extends Error {}
export class ProdiaCapacityError extends Error {}
export class ProdiaBadResponseError extends Error {}

export const createProdia = ({
	token,
	baseUrl = "https://inference.prodia.com/v2",
	maxErrors = 1,
	maxRetries = Infinity,
}: CreateProdiaOptions): Prodia => {
	const job = async (
		params: ProdiaJob,
		_options?: Partial<ProdiaJobOptions>,
	) => {
		const options = {
			...defaultJobOptions,
			..._options,
		};

		let response: Response;

		let errors = 0;
		let retries = 0;

		const formData = new FormData();

		// Handle input files/blobs/buffers
		if (options.inputs !== undefined) {
			for (const input of options.inputs) {
				if (input instanceof Buffer) {
					formData.append("input", input, "image.jpg");
				} else if (input instanceof ArrayBuffer) {
					formData.append(
						"input",
						Buffer.from(input),
						"image.jpg",
					);
				} else {
					throw new Error("Unsupported input type for Node.js backend");
				}
			}
		}

		formData.append(
			"job",
			Buffer.from(JSON.stringify(params)),
			"job.json",
		);

		do {
			response = await fetch(`${baseUrl}/job`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: ["multipart/form-data", options.accept].filter(
						Boolean,
					).join("; "),
				},
				body: formData,
			});

			// Handle successful responses
			if (response.status >= 200 && response.status < 300) {
				break;
			}

			// Handle rate limiting and retry logic
			if (response.status === 429) {
				retries += 1;
			} else if (response.status < 200 || response.status > 299) {
				errors += 1;
			}

			const retryAfter = Number(response.headers.get("Retry-After")) || 1;
			await new Promise((resolve) =>
				setTimeout(resolve, retryAfter * 1000)
			);
		} while (
			response.status !== 400 &&
			response.status !== 401 &&
			response.status !== 403 &&
			(response.status < 200 || response.status > 299) &&
			errors <= maxErrors &&
			retries <= maxRetries
		);

		if (response.status === 429) {
			throw new ProdiaCapacityError(
				"Unable to schedule the job with current token.",
			);
		}

		const body = await response.formData();
		const job = JSON.parse(
			Buffer.from(await body.get("job").arrayBuffer()).toString("utf-8")
		) as ProdiaJob;

		if ("error" in job && typeof job.error === "string") {
			throw new ProdiaUserError(job.error);
		}

		if (response.status < 200 || response.status > 299) {
			throw new ProdiaBadResponseError(
				`${response.status} ${response.statusText}`,
			);
		}

		// Replace FileReader logic with Node.js Buffer handling
		const output = body.get("output");
		if (!output) {
			throw new Error("Output field is missing from the response");
		}

		const buffer = Buffer.from(await output.arrayBuffer());

		return {
			job: job,
			arrayBuffer: () => Promise.resolve(buffer),
		};
	};

	return {
		job,
	};
};


	return {
		job,
	};
};

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

	// currently these are the only output field for all job types.
	// they will return the raw bytes for that output.
	arrayBuffer: () => Promise<ArrayBuffer>;
	uint8Array: () => Promise<Uint8Array>;
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
	maxRetries = 10,
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

		// TODO: The input content-type is assumed here, but it shouldn't be.
		// Eventually we will support non-image inputs and we will need some way
		// to specify the content-type of the input.
		if (options.inputs !== undefined) {
			for (const input of options.inputs) {
				if (typeof File !== "undefined" && input instanceof File) {
					formData.append("input", input, input.name);
				}

				if (input instanceof Blob) {
					formData.append("input", input, "image.jpg");
				}

				if (input instanceof ArrayBuffer) {
					formData.append(
						"input",
						new Blob([input], {
							type: "image/jpeg",
						}),
						"image.jpg",
					);
				}
			}
		}

		formData.append(
			"job",
			new Blob([JSON.stringify(params)], {
				type: "application/json",
			}),
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

			// We bail from the loop if we get a 2xx response to avoid sleeping unnecessarily.
			if (response.status >= 200 && response.status < 300) {
				break;
			}

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
				"Unable to schedule the job. Are your sure your token and job type are correct?",
			);
		}

		if (response.headers.get("Content-Type") === "application/json") {
			const body = await response.json();

			if ("error" in body && typeof body.error === "string") {
				throw new ProdiaUserError(body.error);
			}

			const lastStateHistory = body.state.history.slice(-1)[0];

			if (lastStateHistory && "message" in lastStateHistory) {
				throw new ProdiaUserError(lastStateHistory.message);
			}

			throw new Error("Job Failed: Bad Content-Type: application/json");
		}

		if (response.status < 200 || response.status > 299) {
			throw new ProdiaBadResponseError(
				`${response.status} ${await response.text()}`,
			);
		}

		const body = await response.formData();

		const job = JSON.parse(
			new TextDecoder().decode(
				await (body.get("job") as Blob).arrayBuffer(),
			),
		) as ProdiaJob;

		if ("error" in job && typeof job.error === "string") {
			throw new ProdiaUserError(job.error);
		}

		return {
			job: job,
			arrayBuffer: async () =>
				await (body.get("output") as Blob).arrayBuffer(),
			uint8Array: async () =>
				new Uint8Array(
					await (body.get("output") as Blob).arrayBuffer(),
				),
		};
	};

	return {
		job,
	};
};

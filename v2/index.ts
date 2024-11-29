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
	accept:
		| "image/png"
		| "image/jpeg"
		| "image/webp"
		| "multipart/form-data"
		| "video/mp4";
	inputs?: (File | Blob | ArrayBuffer)[];
};

const defaultJobOptions: ProdiaJobOptions = {
	accept: "image/jpeg",
};

export type ProdiaJobResponse = {
	arrayBuffer: () => Promise<ArrayBuffer>; // we only support direct image response now
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
					Accept: options.accept,
				},
				body: formData,
			});

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
			(response.status < 200 || response.status > 299) &&
			errors <= maxErrors &&
			retries <= maxRetries
		);

		if (response.status === 429) {
			throw new ProdiaCapacityError(
				"Unable to schedule job with current token",
			);
		}

		if (response.status < 200 || response.status > 299) {
			throw new ProdiaBadResponseError(
				`${response.status} ${response.statusText}`,
			);
		}

		return {
			arrayBuffer: () => response.arrayBuffer(),
		};
	};

	return {
		job,
	};
};

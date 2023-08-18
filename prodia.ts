/* Job Responses */

type ProdiaJobBase = { job: string };

export type ProdiaJobQueued = ProdiaJobBase & { status: "queued" };
export type ProdiaJobGenerating = ProdiaJobBase & { status: "generating" };
export type ProdiaJobFailed = ProdiaJobBase & { status: "failed" };
export type ProdiaJobSucceeded = ProdiaJobBase & {
	status: "succeeded";
	imageUrl: string;
};

export type ProdiaJob =
	| ProdiaJobQueued
	| ProdiaJobGenerating
	| ProdiaJobFailed
	| ProdiaJobSucceeded;

/* Generation Requests */

export type ProdiaGenerateRequest = {
	prompt: string;
	model?: string;
	negative_prompt?: string;
	steps?: number;
	cfg_scale?: number;
	seed?: number;
	upscale?: boolean;
	sampler?: string;
	aspect_ratio?: "square" | "portrait" | "landscape";
};

export type ProdiaTransformRequest = {
	imageUrl: string;
	prompt: string;
	model?: string;
	denoising_strength?: number;
	negative_prompt?: string;
	steps?: number;
	cfg_scale?: number;
	seed?: number;
	upscale?: boolean;
	sampler?: string;
};

export type ProdiaControlnetRequest = {
	imageUrl: string;
	controlnet_model: string;
	controlnet_module?: string;
	threshold_a?: number;
	threshold_b?: number;
	resize_mode?: number;
	prompt: string;
	negative_prompt?: string;
	steps?: number;
	cfg_scale?: number;
	seed?: number;
	upscale?: boolean;
	sampler?: string;
	width?: number;
	height?: number;
};

/* Constructor Definions */

export type Prodia = ReturnType<typeof createProdia>;

export type CreateProdiaOptions = {
	apiKey: string;
	base?: string;
};

export const createProdia = ({ apiKey, base: _base }: CreateProdiaOptions) => {
	const base = _base || "https://api.prodia.com/v1";

	const headers = {
		"X-Prodia-Key": apiKey,
	};

	const generate = async (params: ProdiaGenerateRequest) => {
		const response = await fetch(`${base}/job`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(params),
		});

		if (response.status !== 200) {
			throw new Error(`Bad Prodia Response: ${response.status}`);
		}

		return (await response.json()) as ProdiaJobQueued;
	};

	const transform = async (params: ProdiaTransformRequest) => {
		const response = await fetch(`${base}/transform`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(params),
		});

		if (response.status !== 200) {
			throw new Error(`Bad Prodia Response: ${response.status}`);
		}

		return (await response.json()) as ProdiaJobQueued;
	};

	const controlnet = async (params: ProdiaControlnetRequest) => {
		const response = await fetch(`${base}/controlnet`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(params),
		});

		if (response.status !== 200) {
			throw new Error(`Bad Prodia Response: ${response.status}`);
		}

		return (await response.json()) as ProdiaJobQueued;
	};

	const getJob = async (jobId: string) => {
		const response = await fetch(`${base}/job/${jobId}`, {
			headers,
		});

		if (response.status !== 200) {
			throw new Error(`Bad Prodia Response: ${response.status}`);
		}

		return (await response.json()) as ProdiaJob;
	};

	const wait = async (job: ProdiaJobQueued | ProdiaJobGenerating) => {
		let jobResult: ProdiaJob = job;

		while (
			jobResult.status !== "succeeded" &&
			jobResult.status !== "failed"
		) {
			await new Promise((resolve) => setTimeout(resolve, 250));

			jobResult = await getJob(job.job);
		}

		return jobResult as ProdiaJobSucceeded | ProdiaJobFailed;
	};

	const listModels = async () => {
		const response = await fetch(`${base}/models/list`, {
			headers,
		});

		if (response.status !== 200) {
			throw new Error(`Bad Prodia Response: ${response.status}`);
		}

		return (await response.json()) as string[];
	};

	return {
		generate,
		transform,
		controlnet,
		wait,
		getJob,
		listModels,
	};
};

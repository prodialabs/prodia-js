/* Job Responses */

export type ProdiaJobBase = { job: string };

export type ProdiaJobQueued = ProdiaJobBase & {
	imageUrl: undefined;
	status: "queued";
};
export type ProdiaJobGenerating = ProdiaJobBase & {
	imageUrl: undefined;
	status: "generating";
};
export type ProdiaJobFailed = ProdiaJobBase & {
	imageUrl: undefined;
	status: "failed";
};
export type ProdiaJobSucceeded = ProdiaJobBase & {
	imageUrl: string;
	status: "succeeded";
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

type ImageInput = { imageUrl: string } | { imageData: string };

export type ProdiaTransformRequest = ImageInput & {
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

export type ProdiaControlnetRequest = ImageInput & {
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

type MaskInput = { maskUrl: string } | { maskData: string };

export type ProdiaInpaintingRequest =
	& ImageInput
	& MaskInput
	& {
		prompt: string;
		model?: string;
		denoising_strength?: number;
		negative_prompt?: string;
		steps?: number;
		cfg_scale?: number;
		seed?: number;
		upscale?: boolean;
		mask_blur: number;
		inpainting_fill: number;
		inpainting_mask_invert: number;
		inpainting_full_res: string;
		sampler?: string;
	};

export type ProdiaXlGenerateRequest = {
	prompt: string;
	model?: string;
	negative_prompt?: string;
	steps?: number;
	cfg_scale?: number;
	seed?: number;
	upscale?: boolean;
	sampler?: string;
};

/* Constructor Definions */

export type Prodia = {
	// sd generations
	generate: (params: ProdiaGenerateRequest) => Promise<ProdiaJobQueued>;
	transform: (params: ProdiaTransformRequest) => Promise<ProdiaJobQueued>;
	controlnet: (params: ProdiaControlnetRequest) => Promise<ProdiaJobQueued>;
	inpainting: (params: ProdiaInpaintingRequest) => Promise<ProdiaJobQueued>;

	// sdxl generations
	xlGenerate: (params: ProdiaXlGenerateRequest) => Promise<ProdiaJobQueued>;

	// job info
	getJob: (jobId: string) => Promise<ProdiaJob>;
	wait: (params: ProdiaJob) => Promise<ProdiaJobSucceeded | ProdiaJobFailed>;

	// models
	listModels: () => Promise<string[]>;
};

export type CreateProdiaOptions = {
	apiKey: string;
	base?: string;
};

export const createProdia = ({
	apiKey,
	base: _base,
}: CreateProdiaOptions): Prodia => {
	const base = _base || "https://api.prodia.com/v1";

	const headers = {
		"X-Prodia-Key": apiKey,
	};

	const generate = async (params: ProdiaGenerateRequest) => {
		const response = await fetch(`${base}/sd/generate`, {
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
		const response = await fetch(`${base}/sd/transform`, {
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
		const response = await fetch(`${base}/sd/controlnet`, {
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

	const inpainting = async (params: ProdiaInpaintingRequest) => {
		const response = await fetch(`${base}/sd/inpainting`, {
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

	const xlGenerate = async (params: ProdiaXlGenerateRequest) => {
		const response = await fetch(`${base}/sdxl/generate`, {
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

	const wait = async (job: ProdiaJob) => {
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
		inpainting,
		xlGenerate,
		wait,
		getJob,
		listModels,
	};
};

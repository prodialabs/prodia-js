import { createProdia } from "./dist/v2/index.js";
import { strictEqual } from "assert";

const token = process.env.PRODIA_TOKEN;

if (typeof token !== "string") {
	throw new Error("PRODIA_TOKEN is not set");
}

const isJpeg = (image) => {
	const view = new Uint8Array(image);

	return view[0] === 0xff && view[1] === 0xd8;
};

const client = createProdia({
	token,
});

const job = await client.job({
	type: "inference.flux.dev.txt2img.v1",
	config: {
		prompt: "puppies in a cloud, 4k",
		steps: 1,
		width: 1024,
		height: 1024,
	},
});

const image = await job.arrayBuffer();

strictEqual(isJpeg(image), true, "Image should be a JPEG");

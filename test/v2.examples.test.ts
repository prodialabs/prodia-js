import { assert, assertEquals } from "jsr:@std/assert";
import { createProdia } from "../v2/index.ts";

const token = Deno.env.get("PRODIA_TOKEN");

if (typeof token !== "string") {
	throw new Error("PRODIA_TOKEN is not set");
}

const isJpeg = (image: ArrayBuffer): boolean => {
	const view = new Uint8Array(image);

	return view[0] === 0xff && view[1] === 0xd8;
};

const isPng = (image: ArrayBuffer): boolean => {
	const view = new Uint8Array(image);

	return [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].every((byte, i) =>
		byte === view[i]
	);
};

await Deno.test("Example Job: JPEG Output (ArrayBuffer)", async () => {
	const client = createProdia({
		token,
	});

	const job = await client.job({
		type: "inference.flux.schnell.txt2img.v1",
		config: {
			prompt: "puppies in a cloud, 4k",
			steps: 1,
			width: 1024,
			height: 1024,
		},
	});

	const image = await job.arrayBuffer();

	assert(image instanceof ArrayBuffer, "Image should be an ArrayBuffer");
	assert(!(image instanceof Uint8Array), "Image should not be a Uint8Array");
	assertEquals(isJpeg(image), true, "Image should be a JPEG");
});

await Deno.test("Example Job: JPEG Output (Uint8Array)", async () => {
	const client = createProdia({
		token,
	});

	const job = await client.job({
		type: "inference.flux.schnell.txt2img.v1",
		config: {
			prompt: "puppies in a cloud, 4k",
			steps: 1,
			width: 1024,
			height: 1024,
		},
	});

	const image = await job.uint8Array();

	assert(image instanceof Uint8Array, "Image should be a Uint8Array");
	assertEquals(isJpeg(image), true, "Image should be a JPEG");
});

await Deno.test("Example Job: PNG Output (Uint8Array)", async () => {
	const client = createProdia({
		token,
	});

	const job = await client.job({
		type: "inference.flux.schnell.txt2img.v1",
		config: {
			prompt: "puppies in a cloud, 4k",
			steps: 1,
			width: 1024,
			height: 1024,
		},
	}, {
		accept: "image/png",
	});

	const image = await job.uint8Array();

	assert(image instanceof Uint8Array, "Image should be a Uint8Array");
	assertEquals(isPng(image), true, "Image should be a PNG");
});

import { assert, assertEquals } from "jsr:@std/assert";
import { createProdia, ProdiaUserError } from "../v2/index.ts";

const token = Deno.env.get("PRODIA_TOKEN");

if (typeof token !== "string") {
	throw new Error("PRODIA_TOKEN is not set");
}

const isJpeg = (image: ArrayBuffer): boolean => {
	const view = new Uint8Array(image);

	return view[0] === 0xff && view[1] === 0xd8;
};

await Deno.test("Example Job: JPEG Output", async () => {
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

	assertEquals(isJpeg(image), true, "Image should be a JPEG");
});

await Deno.test("Example Job: Bad Face Swap", async () => {
	const client = createProdia({
		token,
	});

	try {
		const job = await client.job(
			{
				type: "inference.faceswap.v1",
				config: {},
			},
			{
				inputs: [
					new Blob([await Deno.readFile("./test/landscape.jpg")], {
						type: "image/jpeg",
					}),
					new Blob([await Deno.readFile("./test/man.jpg")], {
						type: "image/jpeg",
					}),
				],
			},
		);

		const image = await job.arrayBuffer();

		assertEquals(isJpeg(image), true, "Image should be a JPEG");

		throw new Error("FaceSwap should fail");
	} catch (error) {
		assert(
			error instanceof ProdiaUserError,
			`Error should be a ProdiaUserError, got ${error}`,
		);
		assertEquals(
			error.message,
			"No face detected in the source image.",
			"Error message should be 'No face detected in the source image.'",
		);
	}
});

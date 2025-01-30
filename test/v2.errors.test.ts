import { assert, assertStringIncludes } from "jsr:@std/assert";
import {
	createProdia,
	ProdiaBadResponseError,
	ProdiaCapacityError,
	ProdiaUserError,
} from "../v2/index.ts";

const token = Deno.env.get("PRODIA_TOKEN");

if (typeof token !== "string") {
	throw new Error("PRODIA_TOKEN is not set");
}

await Deno.test("Error Propagation: Bad Job Config returns ProdiaUserError", {
	sanitizeResources: false,
}, async () => {
	const client = createProdia({
		token,
	});

	try {
		const job = await client.job({
			type: "inference.flux.schnell.txt2img.v1",
			config: {
				prompt: "puppies in a cloud, 4k",
				steps: 1000,
			},
		});

		throw new Error("Job should not succeed");
	} catch (err) {
		assert(
			err instanceof ProdiaUserError,
			"Error should be a ProdiaUserError",
		);
		assertStringIncludes(err.message, "steps");
		assertStringIncludes(err.message, "maximum: got 1,000");
		assert(
			err.message.match(
				/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
			),
			"Error message should contain a job id",
		);
	}
});

await Deno.test("Error Propagation: No Job Type returns ProdiaCapacityError", {
	sanitizeResources: false,
}, async () => {
	const client = createProdia({
		token,
		maxRetries: 2,
	});

	try {
		await client.job(
			// @ts-ignore
			{
				config: {
					prompt: "puppies in a cloud, 4k",
				},
			},
		);

		throw new Error("Job should not succeed");
	} catch (err) {
		assert(
			err instanceof ProdiaCapacityError,
			"Error should be a ProdiaCapacityError",
		);

		assertStringIncludes(
			err.message,
			"Are your sure your token and job type are correct?",
		);
	}
});

await Deno.test(
	'Error Propagation: Bad Token returns ProdiaBadResponseError "invalid token"',
	{ sanitizeResources: false },
	async () => {
		const client = createProdia({
			token: "bad-token-xxx",
		});

		try {
			await client.job({
				type: "inference.flux.schnell.txt2img.v1",
				config: {
					prompt: "puppies in a cloud, 4k",
				},
			});

			throw new Error("Job should not succeed");
		} catch (err) {
			assert(
				err instanceof ProdiaBadResponseError,
				"Error should be a ProdiaBadResponseError",
			);

			assertStringIncludes(err.message, "401 token is invalid");
		}
	},
);

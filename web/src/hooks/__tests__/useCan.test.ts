// Legacy tests replaced by the JSX-capable version in useCan.test.tsx
// This file intentionally contains no tests to avoid duplicate declarations during transformation.

export {};

// Add a placeholder test so Vitest doesn't fail this file for having no suites.
describe("legacy placeholder", () => {
	it("is intentionally empty", () => {
		expect(true).toBe(true);
	});
});

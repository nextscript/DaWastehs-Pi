import assert from "node:assert/strict";
import test from "node:test";
import { unloadOnExit } from "../extensions/autotuner.ts";

test("unloading on exit is the default and only an explicit falsy AUTOTUNER_UNLOAD_ON_EXIT disables it", () => {
	assert.equal(unloadOnExit({}), true);
	assert.equal(unloadOnExit({ AUTOTUNER_UNLOAD_ON_EXIT: "1" }), true);
	assert.equal(unloadOnExit({ AUTOTUNER_UNLOAD_ON_EXIT: "maybe" }), true);
	for (const value of ["0", "false", "no", "off", " OFF "]) {
		assert.equal(unloadOnExit({ AUTOTUNER_UNLOAD_ON_EXIT: value }), false, value);
	}
});

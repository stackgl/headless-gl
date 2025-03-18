const {
	Worker, isMainThread, parentPort, workerData
} = require('worker_threads');

if (isMainThread) {
	const createContext = require('../..');

	gl(1, 1);

	module.exports = function (dimension) {
		return new Promise((resolve, reject) => {
			const worker = new Worker(__filename, {
				workerData: dimension,
			});

			worker.on('message', resolve);

			worker.on('error', reject);

			worker.on('exit', (code) => {
				if (code !== 0) {
					reject(new Error(`Worker stopped with exit code ${code}`));
				}
			});
		});
	};
} else {
	const createContext = require('../..');
	const dimension = workerData;

	const width = dimension;
	const height = dimension;

	const gl = createContext(width, height);

	gl.clearColor(0, 1, 0, 0.5)
    gl.clear(gl.COLOR_BUFFER_BIT)

    var pixels = new Uint8Array(width * height * 4)
	gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

	gl.destroy()

	parentPort.postMessage(pixels);
}

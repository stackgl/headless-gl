'use strict'

var tape = require('tape')
var glWorker = require("./util/worker");

tape('worker - serial', async function (t) {
	const jobsData = [1, 2, 3];

	t.plan(jobsData.length);

	const results = [];

	for (const data of jobsData) {
		const result = await glWorker(data);

		results.push(result);
	}

	for (const [index, data] of jobsData.entries()) {
		t.equal(results[index].length, data * data * 4);
	}

	t.end()
})

tape('worker - parallel', async function (t) {
	const jobsData = [1, 2, 3];

	t.plan(jobsData.length);

	const results = await Promise.all(jobsData.map(e => glWorker(e)));

	for (const [index, data] of jobsData.entries()) {
		t.equal(results[index].length, data * data * 4);
	}

	t.end()
})

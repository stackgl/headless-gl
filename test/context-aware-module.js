'use strict'

var tape = require('tape')

tape('context-aware-module', function (t) {

	const createContext1 = require('..');
	const { NativeWebGL: NativeWebGL1 } = require("../src/javascript/native-gl");

	const gl1 = createContext1(16, 16);

	t.assert(gl1, "gl context returned");

	gl1.destroy();
	NativeWebGL1.cleanup();

	delete require.cache[require.resolve('..')];
	delete require.cache[require.resolve('../src/javascript/node-index')];
	delete require.cache[require.resolve('../src/javascript/native-gl')];
	delete require.cache[require.resolve('../build/Debug/webgl.node')];
	delete require.cache[require.resolve('../build/Release/webgl.node')];

	const createContext2 = require('..');
	const { NativeWebGL: NativeWebGL2 } = require("../src/javascript/native-gl");

	const gl2 = createContext2(16, 16);

	t.assert(NativeWebGL1 !== NativeWebGL2);
	t.assert(createContext1 !== createContext2);
	t.assert(gl2, "gl context returned");

	t.end()
})

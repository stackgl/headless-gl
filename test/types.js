'use strict'

const path = require('path')
const tape = require('tape')
const ts = require('typescript')

// Compiles each file in test/types as part of a project that imports gl, with or without the DOM types. Expected errors are marked with @ts-expect-error, so any error fails the test.
function check (t, file, lib) {
  const program = ts.createProgram([path.join(__dirname, 'types', file)], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    lib: lib.map(name => `lib.${name}.d.ts`),
    types: [],
    strict: true,
    noEmit: true,
    paths: { gl: [path.join(__dirname, '..', 'index.d.ts')] }
  })
  const errors = ts.getPreEmitDiagnostics(program).map(function (diagnostic) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
    if (!diagnostic.file) {
      return message
    }
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    return `${path.basename(diagnostic.file.fileName)}:${line + 1}: ${message}`
  })
  t.deepEqual(errors, [], `${file} compiles`)
}

tape('types: a Node project without the DOM types', function (t) {
  check(t, 'node.mts', ['es2022'])
  check(t, 'require.cts', ['es2022'])
  t.end()
})

tape('types: a project with the DOM types', function (t) {
  check(t, 'dom.mts', ['es2022', 'dom'])
  check(t, 'custom-context-types.mts', ['es2022', 'dom'])
  t.end()
})

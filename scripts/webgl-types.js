// Copies the WebGL declarations from TypeScript's lib.dom.d.ts into webgl.d.ts, which index.d.ts re-exports, so the types work without the DOM types.
// Usage: node scripts/webgl-types.js
// It leaves out the members headless-gl contexts don't have (canvas and the color space attributes), renames the two context interfaces to HeadlessWebGLRenderingContext and HeadlessWebGL2RenderingContext, turns the constants on the two context classes into WebGLRenderingContextConstants and WebGL2RenderingContextConstants, and drops typed array type arguments, which TypeScript before 5.7 doesn't accept.
// index.d.ts is written by hand, including TexImageSource, which webgl.d.ts imports from it, and the list of re-exports, which this script checks.
// It uses the compiler API of TypeScript 6, which TypeScript 7 no longer has. As of 7.0.2, TypeScript 7's WebGL declarations are the same as 6's.
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const indexPath = path.join(__dirname, '..', 'index.d.ts')
const outputPath = path.join(__dirname, '..', 'webgl.d.ts')

const roots = ['WebGLRenderingContext', 'WebGL2RenderingContext', 'WebGLContextAttributes']
const renamed = { WebGLRenderingContext: 'HeadlessWebGLRenderingContext', WebGL2RenderingContext: 'HeadlessWebGL2RenderingContext' }
const removedMembers = new Set(['canvas', 'drawingBufferColorSpace', 'unpackColorSpace'])
// Declared by hand in index.d.ts.
const handWritten = new Set(['TexImageSource'])
const typedArrays = new Set(['ArrayBufferView', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array'])

const libPath = require.resolve('typescript/lib/lib.dom.d.ts')
const source = ts.createSourceFile(libPath, fs.readFileSync(libPath, 'utf8'), ts.ScriptTarget.Latest, true)

const interfaces = new Map()
const variables = new Map()
for (const statement of source.statements) {
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      variables.set(declaration.name.text, declaration)
    }
  } else if (statement.name) {
    const name = statement.name.text
    if (!interfaces.has(name)) {
      interfaces.set(name, [])
    }
    interfaces.get(name).push(statement)
  }
}

function isRemovedMember (node) {
  return (ts.isPropertySignature(node) || ts.isMethodSignature(node)) && node.name && removedMembers.has(node.name.getText())
}

// Finds every declaration the roots need, without following removed members or hand-written types.
const needed = new Set()
const queue = [...roots]
while (queue.length > 0) {
  const name = queue.shift()
  if (needed.has(name) || handWritten.has(name)) {
    continue
  }
  if (!interfaces.has(name)) {
    // From the ES libraries, which every project has.
    continue
  }
  needed.add(name)
  for (const statement of interfaces.get(name)) {
    statement.forEachChild(function visit (node) {
      if (isRemovedMember(node)) {
        return
      }
      if (ts.isTypeReferenceNode(node)) {
        queue.push(node.typeName.getText())
      } else if (ts.isExpressionWithTypeArguments(node)) {
        queue.push(node.expression.getText())
      }
      node.forEachChild(visit)
    })
  }
}

// Returns the statement's text with the edits applied and re-indented from 4 spaces to 2.
function rewrite (node, extraEdits) {
  const start = node.getFullStart()
  const edits = [...extraEdits]
  node.forEachChild(function visit (child) {
    if (isRemovedMember(child)) {
      edits.push({ start: child.getFullStart(), end: child.getEnd(), text: '' })
      return
    }
    if (ts.isTypeReferenceNode(child) && child.typeArguments && typedArrays.has(child.typeName.getText())) {
      edits.push({ start: child.typeName.getEnd(), end: child.getEnd(), text: '' })
      return
    }
    child.forEachChild(visit)
  })
  let text = node.getFullText()
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, edit.start - start) + edit.text + text.slice(edit.end - start)
  }
  return text
    .replace(/^\n+/, '')
    .split('\n')
    .map(line => {
      const indent = line.match(/^ */)[0].length
      return line.trim() === '' ? '' : ' '.repeat(Math.floor(indent / 2)) + line.slice(indent)
    })
    .join('\n')
}

const blocks = []
for (const statement of source.statements) {
  if (!statement.name || !needed.has(statement.name.text)) {
    continue
  }
  const name = statement.name.text
  const edits = [{ start: statement.getStart(), end: statement.getStart(), text: 'export ' }]
  if (renamed[name]) {
    edits.push({ start: statement.name.getStart(), end: statement.name.getEnd(), text: renamed[name] })
  }
  blocks.push(rewrite(statement, edits))
}

// The constants on the two context classes, from the type of `declare var WebGLRenderingContext: { ... }`.
for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
  const members = variables.get(name).type.members.filter(member => ts.isPropertySignature(member) && member.name.getText() !== 'prototype')
  const lines = members.map(member => '  ' + member.getText().replace(/\s+/g, ' '))
  blocks.push(`export interface ${name}Constants {\n${lines.join('\n')}\n}`)
}

const header = `// @generated by scripts/webgl-types.js from TypeScript ${ts.version}'s lib.dom.d.ts. Run the script again instead of editing this file.
// index.d.ts re-exports these declarations.
import type { TexImageSource } from './index';
`
fs.writeFileSync(outputPath, `${header}\n${blocks.join('\n\n')}\n`)

// Checks that index.d.ts re-exports every declaration in webgl.d.ts, and nothing else.
const declared = blocks.map(block => block.match(/^export (?:interface|type) (\w+)/m)[1])
const reexported = [...fs.readFileSync(indexPath, 'utf8').matchAll(/^ *type (\w+) = WebGL\.(\w+);/gm)].map(match => match[2])
const missing = declared.filter(name => !reexported.includes(name)).sort()
const extra = reexported.filter(name => !declared.includes(name)).sort()
if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error(`Add these to the createContext namespace in index.d.ts:\n${missing.map(name => `  type ${name} = WebGL.${name};`).join('\n')}`)
  }
  if (extra.length > 0) {
    console.error(`Remove these from index.d.ts, since webgl.d.ts no longer declares them: ${extra.join(', ')}`)
  }
  process.exitCode = 1
}

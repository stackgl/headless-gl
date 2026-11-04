'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('sync objects: fenceSync returns a WebGLSync', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
  t.equal(sync.constructor.name, 'WebGLSync', 'fenceSync returns a WebGLSync')
  t.equal(gl.isSync(sync), true, 'which isSync accepts')
  t.equal(gl.getSyncParameter(sync, gl.OBJECT_TYPE), gl.SYNC_FENCE, 'OBJECT_TYPE is SYNC_FENCE')
  t.equal(gl.getSyncParameter(sync, gl.SYNC_CONDITION), gl.SYNC_GPU_COMMANDS_COMPLETE, 'SYNC_CONDITION is SYNC_GPU_COMMANDS_COMPLETE')
  t.equal(gl.getSyncParameter(sync, gl.SYNC_FLAGS), 0, 'SYNC_FLAGS is 0')

  gl.finish()
  t.equal(gl.getSyncParameter(sync, gl.SYNC_STATUS), gl.SIGNALED, 'SYNC_STATUS is SIGNALED after finish')
  t.equal(gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0), gl.ALREADY_SIGNALED, 'clientWaitSync returns ALREADY_SIGNALED')
  gl.waitSync(sync, 0, gl.TIMEOUT_IGNORED)
  t.equal(gl.getError(), gl.NO_ERROR, 'waitSync takes it')

  gl.deleteSync(sync)
  t.equal(gl.isSync(sync), false, 'isSync returns false once it\'s deleted')
  gl.deleteSync(sync)
  gl.deleteSync(null)
  t.equal(gl.getError(), gl.NO_ERROR, 'deleting it again, or deleting null, does nothing')
  t.equal(gl.getSyncParameter(sync, gl.SYNC_STATUS), null, 'getSyncParameter returns null for a deleted sync')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')
  t.equal(gl.clientWaitSync(sync, 0, 0), gl.WAIT_FAILED, 'clientWaitSync returns WAIT_FAILED for it')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')
  gl.waitSync(sync, 0, gl.TIMEOUT_IGNORED)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'waitSync sets INVALID_OPERATION for it')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('sync objects: errors', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const other = createContext(1, 1, { createWebGL2Context: true })
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
  const otherSync = other.fenceSync(other.SYNC_GPU_COMMANDS_COMPLETE, 0)

  t.equal(gl.fenceSync(0, 0), null, 'fenceSync returns null for a condition other than SYNC_GPU_COMMANDS_COMPLETE')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  t.equal(gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 1), null, 'and null for flags other than 0')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.equal(gl.getSyncParameter(sync, gl.SYNC_FENCE), null, 'getSyncParameter returns null for a parameter a sync doesn\'t have')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

  t.equal(gl.isSync(null), false, 'isSync returns false for null')
  t.equal(gl.isSync(otherSync), false, 'and for another context\'s sync')
  gl.deleteSync(otherSync)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'deleteSync sets INVALID_OPERATION for another context\'s sync')
  t.equal(other.isSync(otherSync), true, 'and leaves it')
  t.equal(gl.getSyncParameter(otherSync, gl.SYNC_STATUS), null, 'getSyncParameter returns null for another context\'s sync')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')

  // The sync is 1, so these would take the GL id of a sync if they took numbers.
  t.throws(() => gl.isSync(1), TypeError, 'isSync throws a TypeError for a number')
  t.throws(() => gl.deleteSync(1), TypeError, 'and so does deleteSync')
  t.throws(() => gl.clientWaitSync(1, 0, 0), TypeError, 'and clientWaitSync')
  t.throws(() => gl.waitSync(1, 0, gl.TIMEOUT_IGNORED), TypeError, 'and waitSync')
  t.throws(() => gl.getSyncParameter(1, gl.SYNC_STATUS), TypeError, 'and getSyncParameter')
  t.throws(() => gl.clientWaitSync(null, 0, 0), TypeError, 'clientWaitSync throws a TypeError for null')
  t.throws(() => gl.getSyncParameter(null, gl.SYNC_STATUS), TypeError, 'and so does getSyncParameter')
  t.equal(gl.getError(), gl.NO_ERROR, 'without setting an error')

  other.getExtension('STACKGL_destroy_context').destroy()
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

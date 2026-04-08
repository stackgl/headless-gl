module.exports = function drawTriangle (gl) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-2, -2, -2, 4, 4, -2]), gl.STREAM_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.disableVertexAttribArray(0)
  gl.deleteBuffer(buffer)
}

export class WebGLDrawingBufferWrapper {
  _framebuffer: number;
  _color: number;
  _depthStencil: number;

  constructor(framebuffer: number, color: number, depthStencil: number) {
    this._framebuffer = framebuffer;
    this._color = color;
    this._depthStencil = depthStencil;
  }
}

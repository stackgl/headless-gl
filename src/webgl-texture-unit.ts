import type { WebGLTexture } from './webgl-texture';

export class WebGLTextureUnit {
  _ctx: any;
  _idx: number;
  _mode: number;
  _bind2D: WebGLTexture | null;
  _bindCube: WebGLTexture | null;
  _bind2DArray?: WebGLTexture | null;
  _bind3D?: WebGLTexture | null;

  constructor(ctx: any, idx: number) {
    this._ctx = ctx;
    this._idx = idx;
    this._mode = 0;
    this._bind2D = null;
    this._bindCube = null;
    if (ctx._isWebGL2()) {
      this._bind2DArray = null;
      this._bind3D = null;
    }
  }
}

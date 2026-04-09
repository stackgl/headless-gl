import { Linkable } from './linkable';
import { gl } from './native-gl';

export class WebGLFramebuffer extends Linkable {
  _ctx: any;
  _width: number;
  _height: number;
  _status: number | null;

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._binding = 0;
    this._width = 0;
    this._height = 0;
    this._status = null;
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._framebuffers[this._ | 0];
    gl.deleteFramebuffer.call(ctx, this._ | 0);
  }
}

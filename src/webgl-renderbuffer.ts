import { Linkable } from './linkable';
import { gl } from './native-gl';

export class WebGLRenderbuffer extends Linkable {
  _ctx: any;
  _width: number;
  _height: number;
  _format: number;

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._binding = 0;
    this._width = 0;
    this._height = 0;
    this._format = 0;
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._renderbuffers[this._ | 0];
    gl.deleteRenderbuffer.call(ctx, this._ | 0);
  }
}

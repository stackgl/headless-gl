import { Linkable } from './linkable';
import { gl } from './native-gl';

export class WebGLBuffer extends Linkable {
  _ctx: any;
  _size: number;
  _elements: Uint8Array;

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._size = 0;
    this._elements = new Uint8Array(0);
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._buffers[this._ | 0];
    gl.deleteBuffer.call(ctx, this._ | 0);
  }
}

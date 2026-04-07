import { Linkable } from './linkable';
import { gl } from './native-gl';

export class WebGLTexture extends Linkable {
  _ctx: any;
  _format: number;
  _type: number;
  _complete: boolean;

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._binding = 0;
    this._format = 0;
    this._type = 0;
    this._complete = true;
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._textures[this._ | 0];
    gl.deleteTexture.call(ctx, this._ | 0);
  }
}

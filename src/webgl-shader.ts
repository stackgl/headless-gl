import { Linkable } from './linkable';
import { gl } from './native-gl';

export class WebGLShader extends Linkable {
  _type: number;
  _ctx: any;
  _source: string;
  _compileStatus: boolean;
  _compileInfo: string;

  constructor(_: number, ctx: any, type: number) {
    super(_);
    this._type = type;
    this._ctx = ctx;
    this._source = '';
    this._compileStatus = false;
    this._compileInfo = '';
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._shaders[this._ | 0];
    gl.deleteShader.call(ctx, this._ | 0);
  }
}

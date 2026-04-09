import { Linkable } from './linkable';
import { gl } from './native-gl';
import type { WebGLActiveInfo } from './webgl-active-info';

export class WebGLProgram extends Linkable {
  _ctx: any;
  _linkCount: number;
  _linkStatus: boolean;
  _linkInfoLog: string;
  _attributes: number[];
  _uniforms: WebGLActiveInfo[];

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._linkCount = 0;
    this._linkStatus = false;
    this._linkInfoLog = 'not linked';
    this._attributes = [];
    this._uniforms = [];
  }

  _performDelete(): void {
    const ctx = this._ctx;
    delete ctx._programs[this._ | 0];
    gl.deleteProgram.call(ctx, this._ | 0);
  }
}

import type { WebGLProgram } from './webgl-program';
import type { WebGLActiveInfo } from './webgl-active-info';

export class WebGLUniformLocation {
  _: number;
  _program: WebGLProgram;
  _linkCount: number;
  _activeInfo: WebGLActiveInfo;
  _array: null | number[];

  constructor(_: number, program: WebGLProgram, info: WebGLActiveInfo) {
    this._ = _;
    this._program = program;
    this._linkCount = program._linkCount;
    this._activeInfo = info;
    this._array = null;
  }
}

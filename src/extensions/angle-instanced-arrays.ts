import { gl } from '../native-gl';

export class ANGLEInstancedArrays {
  VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: number;
  ctx: any;
  private _drawArraysInstancedANGLE: (...args: any[]) => any;
  private _drawElementsInstancedANGLE: (...args: any[]) => any;
  private _vertexAttribDivisorANGLE: (...args: any[]) => any;

  constructor(ctx: any) {
    this.VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE = 0x88fe;
    this.ctx = ctx;
    this._drawArraysInstancedANGLE = gl._drawArraysInstancedANGLE.bind(ctx);
    this._drawElementsInstancedANGLE = gl._drawElementsInstancedANGLE.bind(ctx);
    this._vertexAttribDivisorANGLE = gl._vertexAttribDivisorANGLE.bind(ctx);
  }

  drawArraysInstancedANGLE(
    mode: number,
    first: number,
    count: number,
    primCount: number,
  ): void {
    this._drawArraysInstancedANGLE(mode, first, count, primCount);
  }

  drawElementsInstancedANGLE(
    mode: number,
    count: number,
    type: number,
    ioffset: number,
    primCount: number,
  ): void {
    this._drawElementsInstancedANGLE(mode, count, type, ioffset, primCount);
  }

  vertexAttribDivisorANGLE(index: number, divisor: number): void {
    this._vertexAttribDivisorANGLE(index, divisor);
  }
}

export function getANGLEInstancedArrays(ctx: any): ANGLEInstancedArrays {
  return new ANGLEInstancedArrays(ctx);
}

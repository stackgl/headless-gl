import { Linkable } from './linkable';
import { gl } from './native-gl';
import { WebGLVertexArrayObjectState } from './webgl-vertex-attribute';

export class WebGLVertexArrayObject extends Linkable {
  _ctx: any;
  _vertexState: WebGLVertexArrayObjectState;

  constructor(_: number, ctx: any) {
    super(_);
    this._ctx = ctx;
    this._vertexState = new WebGLVertexArrayObjectState(ctx);
  }

  _performDelete(): void {
    this._vertexState.cleanUp();
    delete (this as any)._vertexState;
    delete this._ctx._vaos[this._];
    gl.deleteVertexArray.call(this._ctx, this._ | 0);
  }
}

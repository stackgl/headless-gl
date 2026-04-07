import { Linkable } from '../linkable';
import { gl } from '../native-gl';
import { checkObject } from '../utils';
import { WebGLVertexArrayObjectState } from '../webgl-vertex-attribute';

export class WebGLVertexArrayObjectOES extends Linkable {
  _ctx: any;
  _ext: OESVertexArrayObject;
  _vertexState: WebGLVertexArrayObjectState;

  constructor(_: number, ctx: any, ext: OESVertexArrayObject) {
    super(_);
    this._ctx = ctx;
    this._ext = ext;
    this._vertexState = new WebGLVertexArrayObjectState(ctx);
  }

  _performDelete(): void {
    this._vertexState.cleanUp();
    delete (this as any)._vertexState;
    delete this._ext._vaos[this._];
    gl.deleteVertexArrayOES.call(this._ctx, this._ | 0);
  }
}

export class OESVertexArrayObject {
  VERTEX_ARRAY_BINDING_OES: number;
  _ctx: any;
  _vaos: Record<number, WebGLVertexArrayObjectOES>;
  _activeVertexArrayObject: WebGLVertexArrayObjectOES | null;

  constructor(ctx: any) {
    this.VERTEX_ARRAY_BINDING_OES = 0x85b5;
    this._ctx = ctx;
    this._vaos = {};
    this._activeVertexArrayObject = null;
  }

  createVertexArrayOES(): WebGLVertexArrayObjectOES | null {
    const { _ctx: ctx } = this;
    const arrayId = gl.createVertexArrayOES.call(ctx);
    if (arrayId <= 0) return null;
    const array = new WebGLVertexArrayObjectOES(arrayId, ctx, this);
    this._vaos[arrayId] = array;
    return array;
  }

  deleteVertexArrayOES(array: WebGLVertexArrayObjectOES | null): void {
    const { _ctx: ctx } = this;
    if (!checkObject(array)) {
      throw new TypeError('deleteVertexArrayOES(WebGLVertexArrayObjectOES)');
    }
    if (
      !(array instanceof WebGLVertexArrayObjectOES && ctx._checkOwns(array))
    ) {
      ctx.setError(gl.INVALID_OPERATION);
      return;
    }
    if (array._pendingDelete) return;
    if (this._activeVertexArrayObject === array) {
      this.bindVertexArrayOES(null);
    }
    array._pendingDelete = true;
    array._checkDelete();
  }

  bindVertexArrayOES(array: WebGLVertexArrayObjectOES | null): void {
    const { _ctx: ctx, _activeVertexArrayObject: activeVertexArrayObject } =
      this;
    if (!checkObject(array)) {
      throw new TypeError('bindVertexArrayOES(WebGLVertexArrayObjectOES)');
    }

    if (!array) {
      array = null;
      gl.bindVertexArrayOES.call(ctx, null);
    } else if (
      array instanceof WebGLVertexArrayObjectOES &&
      array._pendingDelete
    ) {
      ctx.setError(gl.INVALID_OPERATION);
      return;
    } else if (ctx._checkWrapper(array, WebGLVertexArrayObjectOES)) {
      gl.bindVertexArrayOES.call(ctx, array._);
    } else {
      return;
    }

    if (activeVertexArrayObject !== array) {
      if (activeVertexArrayObject) {
        activeVertexArrayObject._refCount -= 1;
        activeVertexArrayObject._checkDelete();
      }
      if (array) {
        array._refCount += 1;
      }
    }

    if (array === null) {
      ctx._vertexObjectState = ctx._defaultVertexObjectState;
    } else {
      ctx._vertexObjectState = array._vertexState;
    }

    this._activeVertexArrayObject = array;
  }

  isVertexArrayOES(object: any): boolean {
    const { _ctx: ctx } = this;
    if (!ctx._isObject(object, 'isVertexArrayOES', WebGLVertexArrayObjectOES))
      return false;
    return gl.isVertexArrayOES.call(ctx, object._ | 0);
  }
}

export function getOESVertexArrayObject(ctx: any): OESVertexArrayObject | null {
  const exts = ctx.getSupportedExtensions();
  if (exts && exts.indexOf('OES_vertex_array_object') >= 0) {
    return new OESVertexArrayObject(ctx);
  }
  return null;
}

export class STACKGLDestroyContext {
  destroy: () => void;

  constructor(ctx: any) {
    this.destroy = ctx.destroy.bind(ctx);
  }
}

export function getSTACKGLDestroyContext(ctx: any): STACKGLDestroyContext {
  return new STACKGLDestroyContext(ctx);
}

export class STACKGLResizeDrawingBuffer {
  resize: (w: number, h: number) => void;

  constructor(ctx: any) {
    this.resize = ctx.resize.bind(ctx);
  }
}

export function getSTACKGLResizeDrawingBuffer(
  ctx: any,
): STACKGLResizeDrawingBuffer {
  return new STACKGLResizeDrawingBuffer(ctx);
}

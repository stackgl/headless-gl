export class WebGLActiveInfo {
  size: number;
  type: number;
  name: string;

  constructor(_: { size: number; type: number; name: string }) {
    this.size = _.size;
    this.type = _.type;
    this.name = _.name;
  }
}

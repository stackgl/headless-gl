export class WebGLShaderPrecisionFormat {
  rangeMin: number;
  rangeMax: number;
  precision: number;

  constructor(_: { rangeMin: number; rangeMax: number; precision: number }) {
    this.rangeMin = _.rangeMin;
    this.rangeMax = _.rangeMax;
    this.precision = _.precision;
  }
}

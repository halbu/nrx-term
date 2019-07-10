export class Color {
  public r: number;
  public g: number;
  public b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // public set(r: number, g: number, b: number): void {
  //   this.r = r;
  //   this.g = g;
  //   this.b = b;
  // }

  public equals(that: Color): boolean {
    return this.r === that.r && this.g === that.g && this.b === that.b;
  }

  public equalsRGB(r: number, g: number, b: number): boolean {
    return this.r === r &&
      this.g === g &&
      this.b === b;
  }

  public clone(c: Color): void {
    this.r = c.r;
    this.g = c.g;
    this.b = c.b;
  }

  public static hexToRgb(hex: string): any {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  get uq(): number { return this.r * this.g * this.b; }
}

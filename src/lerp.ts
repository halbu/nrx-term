import { Color } from './color';

export class Lerp {
  private static lerpCache = new Map<string, string>();

  private static lerpColor(a: Color, b: Color, amount: number): Color {
    // let ah = +a.replace('#', '0x'),
    //   ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    //   bh = +b.replace('#', '0x'),
    //   br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
      let rr = a.r + amount * (b.r - a.r);
      let rg = a.g + amount * (b.g - a.g);
      let rb = a.b + amount * (b.b - a.b);

    return new Color(rr, rg, rb);
  }

  /**
   * Returns a new color generated by lerping the two input colors by the given proportion.
   * If this specific lerp result has been computed before for colorA, colorB and proportion, the result will be
   * returned from our results cache rather than computed again.
   * @param  {number} colorA The first of the two colors to lerp.
   * @param  {number} colorB The second of the two colors to lerp.
   * @param  {number} proportion Amount to lerp, where 0 = 100% colorA, 1 = 100% colorB. Valid range [0 ,1].
   * @returns {string}  The resulting color.
   */
  public static getLerp(colorA: Color, colorB: Color, proportion: number): Color {
    // const mapString = colorA + colorB + proportion.toString();
    // if (!this.lerpCache[mapString]) {
    //   this.lerpCache[mapString] = Lerp.lerpColor(colorA, colorB, proportion);
    // }

    return Lerp.lerpColor(colorA, colorB, proportion);
    // console.log(this.lerpCache);
    // return this.lerpCache[mapString];
  }

  public static getLerpFromRgbs(ar: number, ag: number, ab: number, br: number, bg: number, bb: number, amount: number): Color {
    let rr = ar + amount * (br - ar);
    let rg = ag + amount * (bg - ag);
    let rb = ab + amount * (bb - ab);
    
    return new Color(rr, rg, rb);
  }
}

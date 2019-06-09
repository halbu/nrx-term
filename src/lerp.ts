
export class Lerp {
  private static lerpCache = new Map<string, string>();

  private static lerpColor(a: string, b: string, amount: number): string {
    let ah = +a.replace('#', '0x'),
      ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
      bh = +b.replace('#', '0x'),
      br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
      rr = ar + amount * (br - ar),
      rg = ag + amount * (bg - ag),
      rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
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
  public static getLerp(colorA: string, colorB: string, proportion: number): string {
    const mapString = colorA + colorB + proportion.toString();
    if (!this.lerpCache[mapString]) {
      this.lerpCache[mapString] = Lerp.lerpColor(colorA, colorB, proportion);
    }

    // console.log(this.lerpCache);
    return this.lerpCache[mapString];
  }
}
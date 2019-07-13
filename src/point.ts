export class Point {
  public x: number;
  public y: number;

  /**
   * @param  {number} x The initial X position of the point.
   * @param  {number} y The initial Y position of the point.
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns a clone of this Point with identical X and Y values.
   * @returns Point
   */
  public clone(): Point {
    return new Point(this.x, this.y);
  }

  /**
   * Test for equality between this Point and another Point. Returns true if the two Points have identical X and Y
   * values, else returns false.
   * @param  {Point} that The Point to be tested for equality with this Point.
   * @returns boolean
   */
  public equals(that: Point): boolean {
    return (this.x === that.x && this.y === that.y);
  }

  /**
   * Returns the straight-line distance between two points.
   * @returns number
   */
  public distanceTo(that: Point): number {
    return Math.sqrt((this.x - that.x) * (this.x - that.x) + (this.y - that.y) * (this.y - that.y));
  }

  /**
   * Returns the Manhattan distance (sum of differences between X-positions and Y-positions) between two points.
   * @returns number
   */
  public manhattanDistanceTo(that: Point): number {
    return Math.abs(this.x - that.x) + Math.abs(this.y + that.y);
  }

  /**
   * Converts a Point's X and Y values to integers by rounding down.
   * @returns void
   */
  public floor(): void {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
  }

  /**
   * Returns a string representation of this Point.
   * @returns string
   */
  public toString(): string {
    return this.x + ':' + this.y;
  }
}

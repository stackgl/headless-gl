export class Linkable {
  _: number;
  _references: Linkable[];
  _refCount: number;
  _pendingDelete: boolean;
  _binding: number;

  constructor(_: number) {
    this._ = _;
    this._references = [];
    this._refCount = 0;
    this._pendingDelete = false;
    this._binding = 0;
  }

  _link(b: Linkable): boolean {
    this._references.push(b);
    b._refCount += 1;
    return true;
  }

  _unlink(b: Linkable): boolean {
    let idx = this._references.indexOf(b);
    if (idx < 0) return false;
    while (idx >= 0) {
      this._references[idx] = this._references[this._references.length - 1];
      this._references.pop();
      b._refCount -= 1;
      b._checkDelete();
      idx = this._references.indexOf(b);
    }
    return true;
  }

  _linked(b: Linkable): boolean {
    return this._references.indexOf(b) >= 0;
  }

  _checkDelete(): void {
    if (this._refCount <= 0 && this._pendingDelete && this._ !== 0) {
      while (this._references.length > 0) {
        this._unlink(this._references[0]);
      }
      this._performDelete();
      this._ = 0;
    }
  }

  _performDelete(): void {}
}

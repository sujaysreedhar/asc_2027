/**
 * Real loading progress for the countdown. Each tracked item has a weight; the sky's
 * THREE.LoadingManager reports its own loaded/total into one item. Never fakes progress:
 * the value only moves when something actually finished.
 */
export class Progress {
  private items = new Map<string, { weight: number; done: number; label: string }>()
  private listeners = new Set<(value: number, label: string) => void>()

  add(key: string, weight: number, label: string) {
    this.items.set(key, { weight, done: 0, label })
    this.emit(label)
  }

  /** fraction 0..1 for this item */
  set(key: string, fraction: number) {
    const it = this.items.get(key)
    if (!it) throw new Error(`Progress: unknown item "${key}"`)
    it.done = Math.max(it.done, Math.min(1, fraction))
    this.emit(this.nextLabel())
  }

  track<T>(key: string, p: Promise<T>): Promise<T> {
    return p.then(
      (v) => (this.set(key, 1), v),
      (err) => {
        this.set(key, 1) // a failed asset must not stall the countdown; the caller handles the error
        throw err
      },
    )
  }

  remove(key: string) {
    this.items.delete(key)
    this.emit(this.nextLabel())
  }

  get value(): number {
    let w = 0, d = 0
    for (const it of this.items.values()) {
      w += it.weight
      d += it.weight * it.done
    }
    return w ? d / w : 1
  }

  get complete(): boolean {
    return [...this.items.values()].every((it) => it.done >= 1)
  }

  private nextLabel(): string {
    for (const it of this.items.values()) if (it.done < 1) return it.label
    return 'Ignition'
  }

  on(fn: (value: number, label: string) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(label: string) {
    const v = this.value
    this.listeners.forEach((fn) => fn(v, label))
  }
}

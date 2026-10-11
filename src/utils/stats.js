/**
 * 求一组数值的最小 / 最大值。
 *
 * 为什么不用 Math.min(...arr) / Math.max(...arr)：
 * 展开运算符会把每个元素当成函数实参，数组一大就会触发
 * "Maximum call stack size exceeded"。热力图在真实数据下可能有
 * 几万个点（170 探测器 × 288 时间步 ≈ 4.9 万），所以这里用
 * 一次遍历实现，既安全又更快。
 *
 * @template T
 * @param {Iterable<T>} items
 * @param {(item: T) => number} [accessor] 取值函数，默认取元素本身
 * @returns {[number, number]} [min, max]；没有任何有效数值时返回 [0, 1]
 */
export function extent(items, accessor = (v) => v) {
  let min = Infinity
  let max = -Infinity

  for (const item of items) {
    const v = accessor(item)
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }

  if (min === Infinity || max === -Infinity) return [0, 1]
  return [min, max]
}
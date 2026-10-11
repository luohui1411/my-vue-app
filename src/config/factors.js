/**
 * 可解释性影响因子分类（契约固定）
 *
 * 与申报表一致，固定为四类：
 *   时间周期 / 空间邻接 / 天气条件 / 历史趋势
 *
 * 后端返回 factors 时应带 key（取值见下），name 用于展示。
 * 前端会按这个顺序排列，缺失的类别补 0，多出来的因子追加在后面。
 * 这样将来换成雷达图时，四个轴是稳定的。
 */
export const FACTOR_CATEGORIES = [
  { key: 'temporal', name: '时间周期（早晚高峰）' },
  { key: 'spatial', name: '空间邻接（上下游路段）' },
  { key: 'weather', name: '天气条件' },
  { key: 'trend', name: '历史趋势（近期均值）' }
]

/** 合法 key 列表 */
export const FACTOR_KEYS = FACTOR_CATEGORIES.map((c) => c.key)
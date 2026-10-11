/**
 * 精度指标计算 —— 契约中 `metrics` 字段的**口径定义**
 *
 * ┌─ 契约约定 ────────────────────────────────────────────────┐
 * │ metrics 必须基于「历史回测段」计算：                        │
 * │   用模型对历史时间窗的预测值  vs  该窗口的真实观测值        │
 * │ 也就是 actual[i]（真实观测） 与 backtest[i]（模型回测）     │
 * │ 逐点配对后计算 MAE / RMSE / MAPE / R²。                    │
 * │                                                           │
 * │ 不可以用未来段的预测值计算 —— 未来段没有真值。              │
 * │ 前端不会校验数值，但界面上显示的曲线与指标必须能对上，      │
 * │ 否则答辩时被追问无法自圆其说。                             │
 * └───────────────────────────────────────────────────────────┘
 *
 * @param {(number|null)[]} actual 真实观测值
 * @param {(number|null)[]} pred   与 actual 同长度的预测值（不参与计算的位置填 null）
 * @returns {{MAE:number|null, RMSE:number|null, MAPE:number|null, R2:number|null}}
 */
export function computeMetrics(actual, pred) {
  const pairs = []
  const len = Math.min(actual?.length ?? 0, pred?.length ?? 0)

  for (let i = 0; i < len; i++) {
    const a = actual[i]
    const p = pred[i]
    if (typeof a === 'number' && typeof p === 'number' && Number.isFinite(a) && Number.isFinite(p)) {
      pairs.push([a, p])
    }
  }

  const n = pairs.length
  if (!n) return { MAE: null, RMSE: null, MAPE: null, R2: null }

  const mean = pairs.reduce((sum, [a]) => sum + a, 0) / n
  let sumAbsErr = 0
  let sumSqErr = 0
  let sumAbsPctErr = 0
  let sumSqTotal = 0

  for (const [a, p] of pairs) {
    const err = a - p
    sumAbsErr += Math.abs(err)
    sumSqErr += err * err
    if (a !== 0) sumAbsPctErr += Math.abs(err / a)
    sumSqTotal += (a - mean) ** 2
  }

  return {
    MAE: +(sumAbsErr / n).toFixed(2),
    RMSE: +Math.sqrt(sumSqErr / n).toFixed(2),
    MAPE: +((sumAbsPctErr / n) * 100).toFixed(2),
    R2: sumSqTotal === 0 ? null : +(1 - sumSqErr / sumSqTotal).toFixed(3)
  }
}
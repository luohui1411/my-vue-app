/**
 * 页面布局注册表（配置驱动）
 *
 * 结构：外层数组 = 行；内层数组 = 该行的列。
 * 每个单元格支持以下字段：
 *   id        : 唯一标识（必填）
 *   component : 组件（必填）
 *   span      : 栅格宽度，24 栅格制（lg 断点，xs 恒为 24）
 *   when      : (store) => boolean，不满足则不渲染
 *   props     : (store) => object，返回传给组件的 props（也可放事件，如 onSubmit）
 *
 * 新增一个面板 = 在下面加一个对象，不需要动 App.vue。
 */
import MetricCards from '@/components/MetricCards.vue'
import FlowPredictChart from '@/components/FlowPredictChart.vue'
import RegionHeatmap from '@/components/RegionHeatmap.vue'
import SpatialAttentionChart from '@/components/SpatialAttentionChart.vue'
import FeatureImportanceChart from '@/components/FeatureImportanceChart.vue'
import ExplanationPanel from '@/components/ExplanationPanel.vue'

const prediction = (s) => s.resources.prediction.data
const explanation = (s) => s.resources.explanation.data

export const PANEL_LAYOUT = [
  // ---- 预测精度指标 ----
  [
    {
      id: 'metrics',
      component: MetricCards,
      span: 24,
      when: (s) => !!prediction(s),
      props: (s) => ({ metrics: prediction(s)?.metrics })
    }
  ],

  // ---- 预测主图 ----
  [
    {
      id: 'flow',
      component: FlowPredictChart,
      span: 24,
      when: (s) => !!prediction(s),
      props: (s) => ({ data: prediction(s) })
    }
  ],

  // ---- 区域热力 + 因子重要性 ----
  [
    {
      id: 'region-heatmap',
      component: RegionHeatmap,
      span: 14,
      when: (s) => !!prediction(s),
      props: (s) => ({ data: prediction(s) })
    },
    {
      id: 'factor-importance',
      component: FeatureImportanceChart,
      span: 10,
      when: (s) => !!explanation(s),
      props: (s) => ({ factors: explanation(s)?.factors ?? [] })
    }
  ],

  // ---- 空间注意力 + 解释文本 ----
  [
    {
      id: 'spatial-attention',
      component: SpatialAttentionChart,
      span: 12,
      when: (s) => !!explanation(s),
      props: (s) => ({ data: explanation(s) })
    },
    {
      id: 'explanation',
      component: ExplanationPanel,
      span: 12,
      when: (s) => !!explanation(s),
      props: (s) => ({ data: explanation(s) })
    }
  ]
]
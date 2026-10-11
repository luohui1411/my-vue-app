/**
 * 数据结构定义（单一事实来源）
 *
 * 这里描述「后端返回的原始结构」和「前端使用的视图模型」。
 * 后端字段若有变动，只需要改 adapters.js 一处，
 * 组件始终消费下面这些视图模型，不受影响。
 */

/**
 * @typedef {Object} MetricSet
 * @property {number|null} MAE  平均绝对误差
 * @property {number|null} RMSE 均方根误差
 * @property {number|null} MAPE 平均绝对百分比误差
 * @property {number|null} R2   拟合优度
 */

/**
 * @typedef {Object} PredictionViewModel
 * @property {string} region
 * @property {string} dataset
 * @property {string[]} times           时间轴（历史 + 预测）
 * @property {number} boundaryIndex     历史/预测分界点的下标
 * @property {(number|null)[]} actual   历史观测值（预测段为 null）
 * @property {(number|null)[]} predict  预测值（历史段为 null）
 * @property {(number|null)[]} lower    置信区间下界
 * @property {(number|null)[]} upper    置信区间上界
 * @property {string[]} regionNames     区域名称
 * @property {string[]} heatTimes       热力图时间轴
 * @property {number[][]} heatData      热力图数据 [x, y, value]
 * @property {MetricSet} metrics        精度指标
 */

/**
 * @typedef {Object} FactorItem
 * @property {string} name
 * @property {number} weight
 */

/**
 * @typedef {Object} ExplanationViewModel
 * @property {string} intent
 * @property {{task:string, region:string, horizon:string, needExplain:boolean, dataset:string}} parsed
 * @property {FactorItem[]} mainFactors  Top-2 主要影响因子
 * @property {FactorItem[]} factors      全部因子及权重
 * @property {number[][]} attention      空间注意力矩阵 [x, y, weight]
 * @property {string[]} regionNames
 * @property {string} explanation
 * @property {string[]} reasoning
 */

/**
 * @typedef {Object} ApiFilters
 * @property {string} dataset
 * @property {string} region
 * @property {number} [history]
 * @property {number} [horizon]
 * @property {number} [stepMin]
 */

export {}
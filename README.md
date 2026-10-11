# 基于大语言模型的交通流量预测与可解释性分析平台（前端）

> 2026 年大学生创新训练项目 —— 研究内容 3「基于 LLM Agent 的交通流预测可视化系统开发」的前端部分。
> 前后端分离开发，后端未就绪时前端默认走 **本地 Mock**，可独立运行。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Vue 3（`<script setup>` 组合式 API） |
| 构建 | Vite（配置了 `@` → `src` 路径别名） |
| UI 组件库 | Element Plus |
| 图表 | ECharts（按需引入，`echarts/core`） |
| 请求 | Axios |
| 状态 | 轻量自研 store（`src/stores/trafficStore.js`，无需 Pinia） |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 生产构建
npm run check:api  # 接口自检（后端就绪后使用）
```

---

## 目录结构

```
├─ openapi.yaml                   # ★ 接口契约（可导入 Swagger / Postman）
├─ scripts/check-api.mjs          # ★ 接口自检脚本
└─ src/
   ├─ main.js                     # 入口：注册 Element Plus
   ├─ App.vue                     # 纯布局：壳 + 遍历面板注册表
   │
   ├─ config/
   │  ├─ theme.js                 # 视觉单一事实来源（配色 / 网格 / 色带）
   │  ├─ panels.js                # 面板布局注册表（配置驱动）
   │  ├─ query.js                 # ★ 查询参数定义 + buildQueryParams（请求体唯一来源）
   │  └─ factors.js               # ★ 四类影响因子分类（契约固定）
   │
   ├─ types/models.js             # 数据结构定义（JSDoc）
   │
   ├─ api/
   │  ├─ index.js                 # 数据源出口（支持 ?mock=0/1 运行时切换）
   │  ├─ adapters.js              # ★ 原始返回 → 视图模型 + 契约校验
   │  ├─ mockProvider.js          # Mock 数据源
   │  └─ httpProvider.js          # 真实后端数据源
   │
   ├─ stores/trafficStore.js      # 共享状态 + 按资源独立 loading/error + 请求序号防竞态
   ├─ charts/*Option.js           # 图表配置工厂（纯函数）
   ├─ composables/useECharts.js   # ECharts 生命周期封装
   ├─ utils/{stats,metrics}.js    # ★ extent() 与指标口径
   ├─ mock/mockData.js            # ★ 契约的可执行参考实现
   └─ components/                 # 面板组件
```

## 架构分层

```
mockData / 后端  →  api/adapters.js  →  stores/trafficStore.js  →  App.vue
                     （规范化+校验）      （状态+加载+防竞态）        （布局注册表）
                                                                      ↓
                                                          components/*  ← charts/*Option.js
                                                                      ↓
                                                                 useECharts
```

**五条设计约束（改代码时请遵守）：**

1. 组件不直接调 `api`，只读 store。
2. 组件不写死颜色和网格，从 `config/theme.js` 取。
3. 只有 `api/adapters.js` 知道后端字段名。
4. 图表逻辑写在 `charts/*Option.js` 纯函数里。
5. 加面板只改 `config/panels.js`，不动 `App.vue`。

---

## 页面功能

1. **自然语言指令**：输入「预测未来 2 小时 R05 区域交通流量并解释原因」，展示 Agent 的意图解析与执行过程（工具调用链）。
2. **流量预测折线图**：历史观测 + LLM 预测 + 95% 置信区间 + **对比基线（ARIMA / 历史均值）** + 预测起点分割线。
3. **区域热力图**：区域 × 未来时段的流量热度（与折线图同源）。
4. **空间依赖强度**：区域 × 区域的注意力权重矩阵。
5. **影响因子重要性**：**固定四类**因子（时间 / 空间 / 天气 / 历史趋势）的归因权重。
6. **解释文本面板**：意图解析 + Top-2 因子 + 自然语言解释 + 推理过程摘要。
7. **情景模拟**：切换天气 / 节假日 / 早晚高峰，作为 what-if 条件重新预测。

---

## ★ 前后端联调

### 1. 数据源切换

组件只依赖 `src/api/index.js`，切换后端**无需改动任何组件**：

```dotenv
# .env.development
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

也可以在**运行时用地址栏参数临时切换，不用重新构建**：

| 地址 | 效果 |
| --- | --- |
| `http://localhost:5173/` | 按 `.env` 的 `VITE_USE_MOCK` 决定 |
| `http://localhost:5173/?mock=1` | 强制走本地 Mock |
| `http://localhost:5173/?mock=0` | 强制走真实接口 |

页头右上角角标会显示当前是「演示数据 (Mock)」还是「实时接口」。

### 2. 两种部署方式（**必读**）

前端所有请求都走**相对路径** `/api/...`，因此：

**方式 A：同源部署（推荐，零 CORS 配置）**

由 FastAPI 一并托管前端构建产物：

```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
```

此时 `.env.production` 保持 `VITE_API_BASE=/api` 即可。

**方式 B：前后端分开部署（需要配 CORS）**

前端把 `VITE_API_BASE` 指向后端地址：

```dotenv
VITE_API_BASE=http://your-backend:8000
```

后端必须允许跨域：

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://your-frontend-domain"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
```

> 开发环境（`npm run dev`）已经通过 `vite.config.js` 的代理把 `/api` 转发到 `http://127.0.0.1:8000`，
> **开发时不需要配 CORS**。[`vite.config.js`](vite.config.js) 里的代理目标目前是硬编码的，换端口记得改。

### 3. 接口自检

后端实现完接口后跑一遍，全绿就说明前端能正常渲染：

```bash
npm run check:api                              # 默认 http://127.0.0.1:8000
npm run check:api -- http://localhost:9000     # 指定地址
```

脚本会逐个校验字段齐全性、数组长度、索引越界、权重归一化等 40+ 项，退出码非 0 表示有问题。

### 4. 错误响应格式

前端会把错误信息展示给用户。**推荐**后端返回：

```json
{ "message": "模型推理失败：显存不足" }
```

前端同时兼容 FastAPI 默认的 `{ "detail": "..." }`（含校验错误的数组形式）和 `{ "error": "..." }`，
但只有 `message` 是契约里明确约定的。

---

## ★ 接口契约

完整定义见 **[`openapi.yaml`](openapi.yaml)** —— 可直接导入 Swagger UI / Postman / Apifox，
也可据此生成后端脚手架或 mock server。

三个接口的摘要：

### `POST /api/predict`

请求（**前端每次都会把六个字段发全**，后端不要依赖默认值）：

```json
{
  "dataset": "PeMS08",
  "region": "R05",
  "history": 24,
  "horizon": 24,
  "stepMin": 5,
  "scenario": { "weather": "sunny", "holiday": false, "peak": "none" }
}
```

返回：

```json
{
  "region": "R05",
  "dataset": "PeMS08",
  "scenario": { "weather": "sunny", "holiday": false, "peak": "none" },
  "times": ["09:00", "09:05", "..."],
  "actual":  [412, 430, "...", null, null],
  "predict": [null, null, "...", 455, 470],
  "lower":   [null, null, "...", 430, 442],
  "upper":   [null, null, "...", 480, 498],
  "baselines": [
    { "name": "ARIMA",   "values": [null, null, "...", 441, 452] },
    { "name": "历史均值", "values": [null, null, "...", 420, 420] }
  ],
  "regionNames": ["R01", "R02"],
  "heatTimes": ["09:05", "09:10"],
  "heatData": [[0, 0, 412], [1, 0, 430]],
  "metrics": { "MAE": 5.1, "RMSE": 7.2, "MAPE": 6.0, "R2": 0.95 }
}
```

#### 硬性约束（违反会导致图表静默画错）

| 约束 | 说明 |
| --- | --- |
| **长度一致** | `times` / `actual` / `predict` / `lower` / `upper` 长度**必须相同**，等于 `history + horizon` |
| **用 null 占位** | 无值的点填 `null`，不要省略、不要填 0 |
| **`heatData` 轴序** | 每项是 `[时间索引, 区域索引, 数值]` —— **x 在前、y 在后**（写反会让热力图转置） |
| **`heatTimes` 对齐** | `heatTimes` 应等于 `times` 的预测段，长度 = 预测步数 |
| **索引不越界** | `heatData` 的 x < `heatTimes.length`，y < `regionNames.length` |
| **`metrics` 口径** | 基于**历史回测段**计算（模型对历史窗口的预测 vs 真实观测），**不可用未来段预测值**（未来段无真值） |

> 前端在开发环境会做契约校验，不符合约定时在控制台打 `[契约校验]` 警告 —— 请留意。

#### 关于 `boundaryIndex`

**后端不需要返回**。前端根据 `actual` 中最后一个非空值的位置自行推导"预测起点"。
契约里保留这个字段只是为了兼容旧版本实现，返回值会被忽略。

### `POST /api/explain`

请求与 `/api/predict` 完全相同。

返回：

```json
{
  "intent": "预测未来 2 小时 R05 区域交通流量，并解释主要影响因素",
  "parsed": { "task": "交通流量预测", "region": "R05", "horizon": "未来 2 小时", "needExplain": true, "dataset": "PeMS08" },
  "mainFactors": [
    { "key": "temporal", "name": "时间周期（早晚高峰）", "weight": 0.376 }
  ],
  "factors": [
    { "key": "temporal", "name": "时间周期（早晚高峰）", "weight": 0.376 },
    { "key": "spatial",  "name": "空间邻接（上下游路段）", "weight": 0.295 },
    { "key": "weather",  "name": "天气条件", "weight": 0.202 },
    { "key": "trend",    "name": "历史趋势（近期均值）", "weight": 0.127 }
  ],
  "attention": [[0, 0, 1], [1, 0, 0.62]],
  "regionNames": ["R01", "R02"],
  "explanation": "未来 2 小时 R05 区域交通流量预计先升后降……",
  "reasoning": ["步骤 1｜意图解析：…", "步骤 2｜数据准备：…"]
}
```

**`factors` 的 `key` 固定为四类**（与申报表一致）：

| key | 含义 |
| --- | --- |
| `temporal` | 时间周期（早晚高峰） |
| `spatial` | 空间邻接（上下游路段） |
| `weather` | 天气条件 |
| `trend` | 历史趋势（近期均值） |

四类权重之和应为 1。缺类别前端补 0，和不为 1 时前端会自动归一化并告警；后端如有额外因子，
`key` 填 `other`，前端会追加显示在后面。

### `POST /api/agent`

请求：`{ "command": "预测未来2小时 R05 区域交通流量并解释原因" }`

返回：

```json
{
  "region": "R05",
  "dataset": "PeMS08",
  "horizon": 24,
  "scenario": { "weather": "sunny", "holiday": false, "peak": "none" },
  "needExplain": true,
  "intent": "预测未来 2 小时 R05 区域交通流量，并解释主要影响因素",
  "tools": ["predict_traffic", "explain_attribution"],
  "plan": [
    { "step": "意图解析", "detail": "识别为交通流量预测任务，目标区域 R05，跨度 2 小时" },
    { "step": "情景识别", "detail": "未附加特殊条件（基准情景）" },
    { "step": "工具调用", "detail": "predict_traffic(region=R05, horizon=24)" },
    { "step": "工具调用", "detail": "explain_attribution(region=R05)" },
    { "step": "结果汇总", "detail": "生成预测曲线、区域热力图与自然语言解释" }
  ]
}
```

- `region` / `dataset` / `horizon` / `scenario` 会被前端用于更新查询条件；
- `tools` 与 `plan` 用于界面上「Agent 执行过程」面板，展示 Agent 的决策链路。

---

## 演示数据自洽性

`src/mock/mockData.js` 不只是"随便造点数据"，它保证了三件事：

1. **指标是算出来的**：`metrics` 由历史段的「观测 vs 回测」用真实公式计算，
   口径定义在 [`src/utils/metrics.js`](src/utils/metrics.js)；
2. **两个图同源**：热力图中选中区域那一行与折线图的预测段**逐值完全相同**；
3. **情景可复现**：切换天气/节假日/时段后，只有预测段变化，历史段保持不变，
   便于直观对比 what-if 的影响。

---

## 后续可优化项

- [ ] **Element Plus 按需引入**：目前是全量引入（CSS 362 kB），可用 `unplugin-vue-components` 再砍一半体积
- [ ] **自动化测试**：`charts/*Option.js` 是纯函数，适合用 Vitest 固化；`scripts/check-api.mjs` 可扩展为契约测试
- [ ] **空状态 / 错误状态**：数据加载失败时面板目前只是消失，应给出占位与重试入口
- [ ] **跨面板联动**：点热力图某格 → 折线图切到该区域（store 里需要一个 `selected` 状态）
- [ ] **因子雷达图**：四类因子已固定，可直接换成雷达图，更贴合申报表
- [ ] **多步误差曲线**、**反事实解释**、**导出图片 / CSV**
- [ ] **清理死代码**：`adapters.js` 的 `asNullableNumber`、`useECharts` 未被消费的 `getChart`
- [ ] **ESLint / Prettier**
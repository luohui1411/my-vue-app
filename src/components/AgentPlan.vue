<template>
  <el-card shadow="never" class="chart-card plan-card">
    <div class="plan-head">
      <span class="card-title">Agent 执行过程</span>
      <el-tag v-for="t in tools" :key="t" size="small" effect="plain" type="success">
        {{ t }}
      </el-tag>
      <el-tag v-if="intent" size="small" type="info" effect="plain">{{ intent }}</el-tag>
    </div>

    <el-empty v-if="!plan.length" description="尚未执行指令" :image-size="60" />

    <div v-else class="plan-list">
      <div v-for="(p, i) in plan" :key="i" class="plan-item">
        <el-tag size="small" type="info" effect="plain" class="plan-index">{{ i + 1 }}</el-tag>
        <span class="plan-step">{{ p.step }}</span>
        <span class="plan-detail">{{ p.detail }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
/**
 * 展示 LLM Agent 的决策过程：调用了哪些工具、按什么步骤执行。
 * 对应接口返回的 tools / plan 字段（契约见 README）。
 */
defineProps({
  plan: { type: Array, default: () => [] },
  tools: { type: Array, default: () => [] },
  intent: { type: String, default: '' }
})
</script>

<style scoped>
.plan-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.plan-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plan-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  line-height: 1.7;
}
.plan-index {
  flex: none;
}
.plan-step {
  flex: none;
  font-weight: 600;
  color: #303133;
  min-width: 72px;
}
.plan-detail {
  color: #606266;
}
</style>
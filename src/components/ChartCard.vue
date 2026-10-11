<template>
  <el-card shadow="never" class="chart-card">
    <template #header>
      <div class="card-head">
        <span v-if="title" class="card-title">{{ title }}</span>
        <slot name="tags" />
        <span v-if="hint" class="hint">{{ hint }}</span>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<script setup>
/**
 * 统一的图表卡片外壳。
 * 新增面板时直接复用它，保证标题/提示/间距风格一致。
 */
defineProps({
  title: { type: String, default: '' },
  hint: { type: String, default: '' }
})
</script>
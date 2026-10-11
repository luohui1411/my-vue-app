<template>
  <ChartCard title="⑤ 自然语言解释与推理过程">
    <el-descriptions :column="3" border size="small" class="desc">
      <el-descriptions-item label="识别任务">{{ parsed.task }}</el-descriptions-item>
      <el-descriptions-item label="目标区域">{{ parsed.region }}</el-descriptions-item>
      <el-descriptions-item label="预测跨度">{{ parsed.horizon }}</el-descriptions-item>
    </el-descriptions>

    <div class="block-title">主要影响因子（Top-2）</div>
    <div class="factor-tags">
      <el-tag
        v-for="f in mainFactors"
        :key="f.name"
        type="warning"
        effect="dark"
        size="large"
      >
        {{ f.name }} · {{ (f.weight * 100).toFixed(1) }}%
      </el-tag>
    </div>

    <div class="block-title">解释文本</div>
    <div class="explain-box">
      <el-icon class="quote-icon"><ChatDotRound /></el-icon>
      <p>{{ explanation }}</p>
    </div>

    <el-collapse class="reasoning">
      <el-collapse-item title="查看推理过程（Chain-of-Thought 摘要）" name="1">
        <ol class="reasoning-list">
          <li v-for="(step, i) in reasoning" :key="i">{{ step }}</li>
        </ol>
      </el-collapse-item>
    </el-collapse>
  </ChartCard>
</template>

<script setup>
import { computed } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import ChartCard from '@/components/ChartCard.vue'

const props = defineProps({
  /** @type {import('@/types/models').ExplanationViewModel} */
  data: { type: Object, required: true }
})

const parsed = computed(() => props.data?.parsed || {})
const mainFactors = computed(() => props.data?.mainFactors || [])
const explanation = computed(() => props.data?.explanation || '暂无解释文本')
const reasoning = computed(() => props.data?.reasoning || [])
</script>

<style scoped>
.desc {
  margin-bottom: 14px;
}
.block-title {
  font-size: 13px;
  font-weight: 700;
  color: #303133;
  margin: 12px 0 8px;
}
.factor-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.explain-box {
  position: relative;
  background: #f5f9ff;
  border: 1px solid #d9ecff;
  border-left: 4px solid #409eff;
  border-radius: 6px;
  padding: 14px 16px 14px 42px;
  line-height: 1.8;
  font-size: 14px;
  color: #303133;
}
.explain-box p {
  margin: 0;
}
.quote-icon {
  position: absolute;
  left: 14px;
  top: 14px;
  color: #409eff;
  font-size: 18px;
}
.reasoning {
  margin-top: 14px;
}
.reasoning-list {
  margin: 0;
  padding-left: 20px;
  line-height: 2;
  font-size: 13px;
  color: #606266;
}
</style>
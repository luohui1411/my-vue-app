<template>
  <el-card shadow="never" class="chart-card">
    <div class="cmd-wrap">
      <el-input
        v-model="text"
        type="textarea"
        :rows="2"
        resize="none"
        placeholder="请输入自然语言指令，例如：预测未来 2 小时 R05 区域交通流量并解释主要原因"
        @keydown.enter.exact.prevent="send"
      />
      <el-button
        class="send-btn"
        type="primary"
        size="large"
        :loading="loading"
        @click="send"
      >
        <el-icon><Promotion /></el-icon>
        <span style="margin-left: 6px">开始分析</span>
      </el-button>
    </div>

    <div class="examples">
      <span class="label">示例指令：</span>
      <el-tag
        v-for="e in examples"
        :key="e"
        class="ex-tag"
        effect="plain"
        @click="text = e"
      >
        {{ e }}
      </el-tag>
    </div>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

defineProps({
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['submit'])

const text = ref('')
const examples = [
  '预测未来 2 小时 R05 区域交通流量并解释原因',
  '分析早高峰 R03 区域流量变化的主要影响因素',
  '预测未来 30 分钟 R08 区域交通流量'
]

function send() {
  const cmd = text.value.trim()
  if (!cmd) return
  emit('submit', cmd)
}
</script>

<style scoped>
.cmd-wrap {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.send-btn {
  width: 130px;
  height: auto;
}
.examples {
  margin-top: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.examples .label {
  font-size: 13px;
  color: #909399;
}
.ex-tag {
  cursor: pointer;
}
</style>
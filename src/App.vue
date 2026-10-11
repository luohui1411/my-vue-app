<template>
  <el-container class="app">
    <el-header class="app-header">
      <span class="title">基于大语言模型的交通流量预测与可解释性分析平台</span>
      <div class="spacer"></div>

      <el-tag :type="isMock ? 'warning' : 'success'" effect="dark" size="small">
        {{ isMock ? '演示数据 (Mock)' : '实时接口' }}
      </el-tag>

      <el-select
        :model-value="store.filters.dataset"
        style="width: 130px"
        @change="(v) => store.setFilter('dataset', v)"
      >
        <el-option v-for="opt in DATASET_OPTIONS" :key="opt" :label="opt" :value="opt" />
      </el-select>

      <el-select
        :model-value="store.filters.region"
        style="width: 110px"
        @change="(v) => store.setFilter('region', v)"
      >
        <el-option v-for="r in regionOptions" :key="r" :label="r" :value="r" />
      </el-select>

      <el-select
        :model-value="store.filters.horizon"
        style="width: 120px"
        @change="(v) => store.setFilter('horizon', v)"
      >
        <el-option v-for="o in HORIZON_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>

      <!-- 情景模拟：what-if 条件，会作为 scenario 参数发给后端 -->
      <el-popover placement="bottom-end" :width="280" trigger="click">
        <template #reference>
          <el-button :type="scenarioDirty ? 'warning' : 'default'" :plain="!scenarioDirty">
            情景模拟<el-badge v-if="scenarioDirty" is-dot class="scenario-dot" />
          </el-button>
        </template>

        <div class="scenario-form">
          <div class="scenario-row">
            <span class="scenario-label">天气</span>
            <el-select
              :model-value="store.filters.scenario.weather"
              size="small"
              style="width: 120px"
              @change="(v) => store.setScenario('weather', v)"
            >
              <el-option v-for="o in WEATHER_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>

          <div class="scenario-row">
            <span class="scenario-label">时段</span>
            <el-select
              :model-value="store.filters.scenario.peak"
              size="small"
              style="width: 120px"
              @change="(v) => store.setScenario('peak', v)"
            >
              <el-option v-for="o in PEAK_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>

          <div class="scenario-row">
            <span class="scenario-label">节假日</span>
            <el-switch
              :model-value="store.filters.scenario.holiday"
              @change="(v) => store.setScenario('holiday', v)"
            />
          </div>

          <div class="scenario-foot">
            <span class="scenario-tip">改动会作为 what-if 条件重新预测</span>
            <el-button size="small" :disabled="!scenarioDirty" @click="store.resetScenario()">
              重置
            </el-button>
          </div>
        </div>
      </el-popover>

      <el-button :icon="Refresh" circle :loading="store.isLoading" @click="store.loadAll()" />
    </el-header>

    <el-main class="app-main" v-loading="store.isLoading">
      <AgentCommandBar :loading="store.isLoading" @submit="handleCommand" />

      <AgentPlan
        v-if="store.command.plan.length"
        :plan="store.command.plan"
        :tools="store.command.tools"
        :intent="store.command.parsed?.intent || ''"
      />

      <!-- 面板全部由 config/panels.js 驱动，新增面板不需要改这里 -->
      <template v-for="(row, rowIndex) in PANEL_LAYOUT" :key="rowIndex">
        <el-row :gutter="16">
          <template v-for="cell in row" :key="cell.id">
            <el-col v-if="!cell.when || cell.when(store)" :xs="24" :lg="cell.span">
              <component :is="cell.component" v-bind="cell.props ? cell.props(store) : {}" />
            </el-col>
          </template>
        </el-row>
      </template>
    </el-main>
  </el-container>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

import AgentCommandBar from '@/components/AgentCommandBar.vue'
import AgentPlan from '@/components/AgentPlan.vue'
import { PANEL_LAYOUT } from '@/config/panels'
import {
  DATASET_OPTIONS,
  HORIZON_OPTIONS,
  PEAK_OPTIONS,
  WEATHER_OPTIONS,
  isBaselineScenario
} from '@/config/query'
import { useTrafficStore, RESOURCE_NAMES, RESOURCE_LABELS } from '@/stores/trafficStore'
import { makeRegions } from '@/mock/mockData'

const store = useTrafficStore()
const regionOptions = makeRegions(12)

const isMock = computed(() => store.mode === 'mock')
const scenarioDirty = computed(() => !isBaselineScenario(store.filters.scenario))

/**
 * 提交自然语言指令。
 * 加载失败时由下面的 watch 统一报错，这里只在全部成功时提示成功，
 * 避免出现"绿色成功 + 红色失败"两条互相矛盾的消息。
 */
async function handleCommand(text) {
  const { parsed, ok } = await store.applyCommand(text)
  if (!ok) return
  ElMessage.success(
    parsed?.intent ? `已解析指令：${parsed.intent}` : '已解析指令，正在生成预测与解释...'
  )
}

/** 任一资源加载失败时给出提示（各资源独立，互不影响） */
RESOURCE_NAMES.forEach((name) => {
  watch(
    () => store.resources[name].error,
    (err) => {
      if (err) ElMessage.error(`${RESOURCE_LABELS[name]}加载失败：${err}`)
    }
  )
})

onMounted(() => {
  store.loadAll()
})
</script>

<style scoped>
.scenario-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.scenario-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.scenario-label {
  font-size: 13px;
  color: #606266;
}
.scenario-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}
.scenario-tip {
  font-size: 12px;
  color: #909399;
}
.scenario-dot {
  margin-left: 2px;
}
</style>
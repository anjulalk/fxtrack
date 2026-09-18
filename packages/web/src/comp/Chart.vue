<script setup lang="ts">
import {
  AreaSeries,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DASH, rate } from '../lib/fmt'
import { bestSeries, cbslSeries, clearPicks, mkt, mode, picked, rows, toggle, win, WINDOWS } from '../lib/store'

const host = ref<HTMLDivElement | null>(null)
let chart: IChartApi | null = null
let area: ISeriesApi<'Area'> | null = null
let ref_: ISeriesApi<'Line'> | null = null
const lines = new Map<string, ISeriesApi<'Line'>>()

const TONE = {
  buy: { line: '#ffa640', top: 'rgba(255,166,64,0.28)', bot: 'rgba(255,166,64,0.01)' },
  sell: { line: '#2ee6a8', top: 'rgba(46,230,168,0.28)', bot: 'rgba(46,230,168,0.01)' },
} as const

function toPoints(s: { days: string[]; vals: (number | null)[] }) {
  const out: { time: UTCTimestamp; value: number }[] = []
  for (let i = 0; i < s.days.length; i++) {
    const v = s.vals[i]
    const d = s.days[i]
    if (v == null || !d) continue
    out.push({ time: (Date.parse(`${d}T00:00:00Z`) / 1000) as UTCTimestamp, value: v })
  }
  return out
}

const data = computed(() => toPoints(bestSeries.value))
const refData = computed(() => toPoints(cbslSeries.value))

function paint() {
  if (!area) return
  const t = TONE[mode.value]
  area.applyOptions({ lineColor: t.line, topColor: t.top, bottomColor: t.bot })
}

function sync() {
  if (!chart) return

  const want = new Set(picked.value.map((p) => p.id))
  for (const [id, s] of [...lines]) {
    if (want.has(id)) continue
    chart.removeSeries(s)
    lines.delete(id)
  }

  for (const p of picked.value) {
    let s = lines.get(p.id)
    if (!s) {
      s = chart.addSeries(LineSeries, {
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        // History starts when we do, so a bank may only have one point.
        pointMarkersVisible: true,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      })
      lines.set(p.id, s)
    }
    s.applyOptions({ color: p.color })
    s.setData(toPoints(p))
  }
}

function draw() {
  if (!area || !ref_ || !chart) return
  area.setData(data.value)
  ref_.setData(refData.value)
  sync()
  chart.timeScale().fitContent()
}

onMounted(() => {
  if (!host.value) return

  chart = createChart(host.value, {
    autoSize: true,
    layout: {
      background: { color: 'transparent' },
      textColor: '#5a7290',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: 'rgba(255,255,255,0.05)', style: LineStyle.Solid },
    },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.18, bottom: 0.12 } },
    timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
    crosshair: {
      vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: LineStyle.Dashed, labelVisible: false },
      horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: LineStyle.Dashed },
    },
    handleScale: false,
    handleScroll: false,
  })

  area = chart.addSeries(AreaSeries, {
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  })

  ref_ = chart.addSeries(LineSeries, {
    color: 'rgba(133,153,179,0.55)',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  })

  paint()
  draw()
})

onBeforeUnmount(() => {
  chart?.remove()
  chart = null
  area = null
  ref_ = null
  lines.clear()
})

watch([data, refData], draw)
watch(picked, sync)
watch(mode, paint)
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-ink-100">Best available rate</h2>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          <span class="flex items-center gap-1.5">
            <span
              class="h-0.5 w-4 rounded-full"
              :class="mode === 'buy' ? 'bg-buy' : 'bg-sell'"
            />
            Best of {{ rows.length }} banks
          </span>
          <span v-if="refData.length" class="flex items-center gap-1.5">
            <span class="h-0 w-4 border-t border-dashed border-ink-300/60" />
            Market average (Central Bank)
          </span>
        </div>
      </div>

      <div class="flex rounded-lg border border-white/8 bg-ink-900/60 p-0.5">
        <button
          v-for="w in WINDOWS"
          :key="w.id"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition"
          :class="
            win === w.id
              ? 'bg-white/10 text-ink-100'
              : 'text-ink-400 hover:text-ink-200'
          "
          @click="win = w.id"
        >
          {{ w.label }}
        </button>
      </div>
    </div>

    <div v-if="picked.length" class="mt-3 flex flex-wrap items-center gap-1.5">
      <span
        v-for="p in picked"
        :key="p.id"
        class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-1 text-xs"
      >
        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: p.color }" />
        <span class="text-ink-200">{{ p.name }}</span>
        <button
          type="button"
          class="rounded-full px-1 leading-none text-ink-500 transition hover:text-ink-100"
          :aria-label="`Remove ${p.name}`"
          @click="toggle(p.id)"
        >
          &times;
        </button>
      </span>
      <button
        type="button"
        class="ml-1 text-xs text-ink-500 underline-offset-2 transition hover:text-ink-200 hover:underline"
        @click="clearPicks"
      >
        Clear
      </button>
    </div>

    <div ref="host" class="mt-4 h-[280px] w-full sm:h-[340px]" />

    <p v-if="!data.length && !refData.length" class="-mt-32 text-center text-sm text-ink-500">
      No history yet for this window.
    </p>

    <div class="mt-4 border-t border-white/5 pt-4">
      <p class="text-[11px] uppercase tracking-wider text-ink-600">
        Market average over this window
      </p>
      <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="s in [
          { k: 'Low', v: mkt.min },
          { k: 'High', v: mkt.max },
          { k: 'Average', v: mkt.avg },
          { k: 'Change', v: mkt.chg },
        ]" :key="s.k">
          <p class="text-[11px] uppercase tracking-wider text-ink-500">{{ s.k }}</p>
          <p class="num mt-0.5 text-sm text-ink-100">
            {{ s.v == null ? DASH : rate(s.v) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

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
import { dark } from '../lib/theme'
import {
  bestSeries,
  cbslSeries,
  clearPicks,
  icon,
  kind,
  mkt,
  mode,
  picked,
  rows,
  toggle,
  win,
  WINDOWS,
} from '../lib/store'

const host = ref<HTMLDivElement | null>(null)
let chart: IChartApi | null = null
let area: ISeriesApi<'Area'> | null = null
let ref_: ISeriesApi<'Line'> | null = null
const lines = new Map<string, ISeriesApi<'Line'>>()

const TONE = {
  light: {
    buy: { line: '#b3541d', top: 'rgba(179,84,29,0.20)', bot: 'rgba(179,84,29,0.01)' },
    sell: { line: '#157a58', top: 'rgba(21,122,88,0.20)', bot: 'rgba(21,122,88,0.01)' },
  },
  dark: {
    buy: { line: '#e7966e', top: 'rgba(231,150,110,0.22)', bot: 'rgba(231,150,110,0.01)' },
    sell: { line: '#6cc4a1', top: 'rgba(108,196,161,0.22)', bot: 'rgba(108,196,161,0.01)' },
  },
} as const

const SKIN = {
  light: {
    text: '#94907f',
    grid: 'rgba(28,27,23,0.06)',
    cross: 'rgba(28,27,23,0.28)',
    ref: 'rgba(102,98,79,0.55)',
  },
  dark: {
    text: '#948e80',
    grid: 'rgba(244,242,236,0.09)',
    cross: 'rgba(244,242,236,0.30)',
    ref: 'rgba(205,200,187,0.45)',
  },
} as const

const skin = () => (dark.value ? SKIN.dark : SKIN.light)
const tone = () => TONE[dark.value ? 'dark' : 'light'][mode.value]

function toPoints(s: { ts: number[]; vals: (number | null)[] }) {
  const out: { time: UTCTimestamp; value: number }[] = []
  for (let i = 0; i < s.ts.length; i++) {
    const v = s.vals[i]
    const ts = s.ts[i]
    if (v == null || ts == null) continue
    out.push({ time: ts as UTCTimestamp, value: v })
  }
  return out
}

const data = computed(() => toPoints(bestSeries.value))
const refData = computed(() => toPoints(cbslSeries.value))

const lede = computed(() => {
  if (win.value === '1d') {
    return kind.value === 'card'
      ? 'The estimated landed cost at each scheduled snapshot in the last 24 hours.'
      : mode.value === 'buy'
        ? 'The lowest selling rate captured at each scheduled snapshot.'
        : 'The highest buying rate captured at each scheduled snapshot.'
  }
  return kind.value === 'card'
    ? 'The lowest estimated landed cost for a USD card purchase, day by day.'
    : mode.value === 'buy'
      ? 'The lowest price anyone was selling dollars at, day by day.'
      : 'The highest price anyone was buying dollars at, day by day.'
})

function paint() {
  if (!area) return
  const t = tone()
  area.applyOptions({ lineColor: t.line, topColor: t.top, bottomColor: t.bot })
}

/** Repaints the chrome (axis, grid, crosshair, reference line) for the theme. */
function reskin() {
  if (!chart) return
  const s = skin()
  chart.applyOptions({
    layout: { textColor: s.text },
    grid: { horzLines: { color: s.grid } },
    crosshair: { vertLine: { color: s.cross }, horzLine: { color: s.cross } },
  })
  ref_?.applyOptions({ color: s.ref })
  paint()
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

  const s = skin()
  chart = createChart(host.value, {
    autoSize: true,
    layout: {
      background: { color: 'transparent' },
      textColor: s.text,
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: s.grid, style: LineStyle.Solid },
    },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.18, bottom: 0.12 } },
    timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
    crosshair: {
      vertLine: { color: s.cross, width: 1, style: LineStyle.Dashed, labelVisible: false },
      horzLine: { color: s.cross, width: 1, style: LineStyle.Dashed },
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
    color: s.ref,
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
watch(dark, reskin)
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ink">Best available rate</h2>
        <p class="mt-0.5 text-sm text-mute">{{ lede }}</p>
        <div class="ui mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-soft">
          <span class="flex items-center gap-1.5">
            <span class="h-0.5 w-4 rounded-full" :class="mode === 'buy' ? 'bg-buy' : 'bg-sell'" />
            Best of {{ rows.length }} banks
          </span>
          <span v-if="refData.length" class="flex items-center gap-1.5">
            <span class="h-0 w-4 border-t border-dashed border-mute/60" />
            Central Bank mid rate
          </span>
        </div>
      </div>

      <div class="flex rounded-lg border border-line bg-wash p-0.5">
        <button
          v-for="w in WINDOWS"
          :key="w.id"
          type="button"
          class="ui rounded-md px-2.5 py-1 text-xs font-medium transition"
          :class="win === w.id ? 'bg-card text-ink shadow-sm' : 'text-mute hover:text-ink'"
          @click="win = w.id"
        >
          {{ w.label }}
        </button>
      </div>
    </div>

    <div v-if="picked.length" class="mt-3.5 flex flex-wrap items-center gap-1.5">
      <span
        v-for="p in picked"
        :key="p.id"
        class="ui flex items-center gap-1.5 rounded-full border border-line bg-wash py-1 pl-1.5 pr-1 text-xs"
      >
        <img :src="icon(p.id)" alt="" class="h-4 w-4 rounded-[3px] object-contain" loading="lazy" />
        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: p.color }" />
        <span class="text-ink">{{ p.name }}</span>
        <button
          type="button"
          class="rounded-full px-1 leading-none text-soft transition hover:text-ink"
          :aria-label="`Remove ${p.name}`"
          @click="toggle(p.id)"
        >
          &times;
        </button>
      </span>
      <button
        type="button"
        class="ui ml-1 text-xs text-soft underline-offset-2 transition hover:text-ink hover:underline"
        @click="clearPicks"
      >
        Clear
      </button>
    </div>

    <div ref="host" class="mt-4 h-[280px] w-full sm:h-[340px]" />

    <p v-if="!data.length && !refData.length" class="-mt-32 text-center text-sm text-soft">
      No history yet for this window.
    </p>

    <div class="mt-4 border-t border-hair pt-4">
      <p class="label text-soft">Market rate over this window</p>
      <div class="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="s in [
          { k: 'Low', v: mkt.min },
          { k: 'High', v: mkt.max },
          { k: 'Average', v: mkt.avg },
          { k: 'Change', v: mkt.chg },
        ]" :key="s.k">
          <p class="label text-soft">{{ s.k }}</p>
          <p class="num mt-1 text-sm text-ink">
            {{ s.v == null ? DASH : rate(s.v) }}
          </p>
        </div>
      </div>
      <p class="mt-3 text-sm leading-snug text-soft">
        <span v-if="win === '1d'">
          Shows the scheduled snapshots received in the last 24 hours; unchanged bank quotes are
          carried forward between runs.
        </span>
        <span v-else>
          Drawn from the Central Bank's indicative spot rate, published every trading day since
          2010, which is the fairest way to judge whether today is cheap or dear.
        </span>
      </p>
    </div>
  </section>
</template>

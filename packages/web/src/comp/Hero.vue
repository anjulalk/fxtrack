<script setup lang="ts">
import { computed } from 'vue'
import { DASH, money, rate } from '../lib/fmt'
import { amount, best, mode, rows, save, trendGrade, win, WINDOWS, worst } from '../lib/store'

const winLabel = computed(() => WINDOWS.find((w) => w.id === win.value)?.label ?? '')

const verb = computed(() => (mode.value === 'buy' ? 'pay' : 'get'))
const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))

const LABEL = {
  buy: { great: 'Good time to buy', good: 'Fair time to buy', fair: 'Not ideal', poor: 'Wait if you can' },
  sell: { great: 'Good time to sell', good: 'Fair time to sell', fair: 'Not ideal', poor: 'Hold if you can' },
} as const

const signal = computed(() => {
  const g = trendGrade.value
  return g ? LABEL[mode.value][g] : null
})

const tone = computed(() => {
  switch (trendGrade.value) {
    case 'great':
      return 'border-up/30 bg-up/10 text-up'
    case 'good':
      return 'border-brand/30 bg-brand/10 text-brand'
    case 'fair':
      return 'border-gold/30 bg-gold/10 text-gold'
    case 'poor':
      return 'border-down/30 bg-down/10 text-down'
    default:
      return 'border-white/10 bg-white/5 text-ink-300'
  }
})

const bank = computed(() => best.value?.rate.bank ?? null)
const spread = computed(() => {
  const b = best.value
  const w = worst.value
  return b && w ? Math.abs(w.v - b.v) : null
})
</script>

<template>
  <section class="card rise p-6 sm:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.18em] text-ink-400">
          Best rate right now
        </p>
        <div class="mt-3 flex items-end gap-3">
          <span class="num text-5xl font-semibold leading-none sm:text-6xl" :class="accent">
            {{ rate(best?.v) }}
          </span>
          <span class="pb-1 text-sm text-ink-400">LKR / USD</span>
        </div>
        <p class="mt-3 text-sm text-ink-300">
          You {{ verb }}
          <span class="num text-ink-100">{{ rate(best?.v) }}</span>
          per dollar at
          <span class="font-medium text-ink-100">{{ bank ?? DASH }}</span>
        </p>
      </div>

      <span
        v-if="signal"
        class="rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide"
        :class="tone"
        :title="'Based on where the market average sits in its ' + winLabel + ' range'"
      >
        {{ signal }}
        <span class="font-normal opacity-70">· {{ winLabel }} market range</span>
      </span>
    </div>

    <div class="mt-7 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-ink-500">Banks compared</p>
        <p class="num mt-1 text-xl">{{ rows.length }}</p>
      </div>
      <div class="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-ink-500">Best vs worst</p>
        <p class="num mt-1 text-xl">{{ spread == null ? DASH : rate(spread) }}</p>
      </div>
      <div class="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-ink-500">
          Saved on ${{ money(amount) }}
        </p>
        <p class="num mt-1 text-xl" :class="accent">Rs {{ money(save) }}</p>
      </div>
    </div>
  </section>
</template>

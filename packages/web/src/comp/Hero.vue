<script setup lang="ts">
import { computed } from 'vue'
import { DASH, money, rate } from '../lib/fmt'
import {
  amount,
  bankMap,
  best,
  icon,
  mode,
  rows,
  save,
  trendGrade,
  win,
  WINDOWS,
  worst,
} from '../lib/store'

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
      return 'border-up/35 bg-up/8 text-up'
    case 'good':
      return 'border-brand/35 bg-brand/8 text-brand'
    case 'fair':
      return 'border-gold/40 bg-gold/10 text-gold'
    case 'poor':
      return 'border-down/35 bg-down/8 text-down'
    default:
      return 'border-line bg-wash text-mute'
  }
})

const id = computed(() => best.value?.rate.bank ?? null)
const bank = computed(() => (id.value ? (bankMap.value.get(id.value)?.name ?? id.value) : null))

const spread = computed(() => {
  const b = best.value
  const w = worst.value
  return b && w ? Math.abs(w.v - b.v) : null
})

const side = computed(() =>
  mode.value === 'buy'
    ? 'the lowest selling rate of any bank we track'
    : 'the highest buying rate of any bank we track',
)
</script>

<template>
  <section class="card rise p-6 sm:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="label text-faint">Best rate right now</p>
        <div class="mt-3 flex items-end gap-3">
          <span class="fig text-6xl font-semibold leading-none sm:text-7xl" :class="accent">
            {{ rate(best?.v) }}
          </span>
          <span class="ui pb-1.5 text-xs text-faint">LKR per USD</span>
        </div>

        <p class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-mute">
          <span>You {{ verb }}</span>
          <span class="num text-ink">{{ rate(best?.v) }}</span>
          <span>per dollar at</span>
          <span v-if="bank" class="inline-flex items-center gap-1.5 font-semibold text-ink">
            <img
              :src="icon(id!)"
              :alt="''"
              class="h-[18px] w-[18px] rounded-[4px] object-contain"
              loading="lazy"
            />
            {{ bank }}
          </span>
          <span v-else>{{ DASH }}</span>
        </p>
        <p class="mt-1.5 text-[13px] text-faint">That is {{ side }} today.</p>
      </div>

      <span
        v-if="signal"
        class="ui shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
        :class="tone"
        :title="'Based on where the market rate sits in its ' + winLabel + ' range'"
      >
        {{ signal }}
        <span class="font-normal opacity-75">&middot; {{ winLabel }} market range</span>
      </span>
    </div>

    <div class="mt-8 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-hair bg-wash px-4 py-3">
        <p class="label text-faint">Banks compared</p>
        <p class="num mt-1.5 text-xl text-ink">{{ rows.length }}</p>
      </div>
      <div class="rounded-xl border border-hair bg-wash px-4 py-3">
        <p class="label text-faint">Best vs worst</p>
        <p class="num mt-1.5 text-xl text-ink">
          {{ spread == null ? DASH : rate(spread) }}
        </p>
      </div>
      <div class="rounded-xl border border-hair bg-wash px-4 py-3">
        <p class="label text-faint">Saved on ${{ money(amount) }}</p>
        <p class="num mt-1.5 text-xl" :class="accent">Rs {{ money(save) }}</p>
      </div>
    </div>

    <p class="mt-3 text-[13px] leading-snug text-faint">
      "Saved" is what the spread is worth to you: the difference between dealing with the best
      bank and the worst one on the amount you entered below.
    </p>
  </section>
</template>

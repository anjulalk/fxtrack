<script setup lang="ts">
import { computed } from 'vue'
import { DASH, money, rate } from '../lib/fmt'
import { amount, best, mode, worst } from '../lib/store'

const PRESETS = [500, 1000, 5000, 25000]

const lkr = computed(() => (best.value ? best.value.v * amount.value : null))
const lost = computed(() => (worst.value ? worst.value.v * amount.value : null))
const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))

const heading = computed(() =>
  mode.value === 'buy' ? 'To buy this many dollars' : 'Selling this many dollars',
)
const result = computed(() => (mode.value === 'buy' ? 'It costs you' : 'You receive'))

function set(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  amount.value = Number.isFinite(v) && v > 0 ? v : 0
}
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-sm font-semibold text-ink-100">Converter</h2>
    <p class="mt-0.5 text-xs text-ink-500">At the best rate available today</p>

    <label class="mt-4 block text-[11px] uppercase tracking-wider text-ink-500">
      {{ heading }}
    </label>
    <div class="mt-2 flex items-center gap-2 rounded-xl border border-white/8 bg-ink-900/60 px-3.5 py-2.5 focus-within:border-brand/50">
      <span class="text-sm text-ink-400">$</span>
      <input
        :value="amount"
        type="number"
        min="0"
        step="100"
        inputmode="decimal"
        class="num w-full bg-transparent text-lg text-ink-100 outline-none"
        @input="set"
      />
    </div>

    <div class="mt-2.5 flex flex-wrap gap-1.5">
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        class="rounded-lg border px-2.5 py-1 text-xs transition"
        :class="
          amount === p
            ? 'border-brand/40 bg-brand/10 text-brand'
            : 'border-white/8 text-ink-400 hover:border-white/15 hover:text-ink-200'
        "
        @click="amount = p"
      >
        ${{ money(p) }}
      </button>
    </div>

    <div class="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <p class="text-[11px] uppercase tracking-wider text-ink-500">{{ result }}</p>
      <p class="num mt-1 text-2xl font-semibold" :class="accent">
        Rs {{ lkr == null ? DASH : money(lkr) }}
      </p>
      <p class="mt-2 text-xs text-ink-500">
        At {{ rate(best?.v) }} per dollar &middot; worst bank
        <span class="num">Rs {{ lost == null ? DASH : money(lost) }}</span>
      </p>
    </div>
  </section>
</template>

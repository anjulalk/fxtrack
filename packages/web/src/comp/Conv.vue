<script setup lang="ts">
import { computed } from 'vue'
import { DASH, money, rate } from '../lib/fmt'
import { amount, bankMap, best, icon, mode, worst } from '../lib/store'

const PRESETS = [500, 1000, 5000, 25000]

const lkr = computed(() => (best.value ? best.value.v * amount.value : null))
const lost = computed(() => (worst.value ? worst.value.v * amount.value : null))
const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))

const heading = computed(() =>
  mode.value === 'buy' ? 'Dollars you want to buy' : 'Dollars you want to sell',
)
const result = computed(() => (mode.value === 'buy' ? 'It costs you' : 'You receive'))

const id = computed(() => best.value?.rate.bank ?? null)
const bank = computed(() => (id.value ? (bankMap.value.get(id.value)?.name ?? id.value) : null))
const worstName = computed(() => {
  const w = worst.value?.rate.bank
  return w ? (bankMap.value.get(w)?.name ?? w) : null
})

const diff = computed(() => {
  const a = lkr.value
  const b = lost.value
  return a == null || b == null ? null : Math.abs(b - a)
})

function set(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  amount.value = Number.isFinite(v) && v > 0 ? v : 0
}
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-lg font-semibold text-ink">Converter</h2>
    <p class="mt-0.5 text-[13px] text-mute">
      Priced at the best rate on the board right now.
    </p>

    <label class="label mt-5 block text-faint">{{ heading }}</label>
    <div
      class="mt-2 flex items-center gap-2 rounded-xl border border-line bg-wash px-3.5 py-2.5 transition focus-within:border-brand/60 focus-within:bg-card"
    >
      <span class="ui text-sm text-faint">$</span>
      <input
        :value="amount"
        type="number"
        min="0"
        step="100"
        inputmode="decimal"
        class="num w-full bg-transparent text-lg text-ink outline-none"
        @input="set"
      />
    </div>

    <div class="mt-2.5 flex flex-wrap gap-1.5">
      <button
        v-for="p in PRESETS"
        :key="p"
        type="button"
        class="ui rounded-lg border px-2.5 py-1 text-xs transition"
        :class="
          amount === p
            ? 'border-brand/45 bg-brand/8 text-brand'
            : 'border-line text-mute hover:border-faint/60 hover:text-ink'
        "
        @click="amount = p"
      >
        ${{ money(p) }}
      </button>
    </div>

    <div class="mt-5 rounded-xl border border-hair bg-wash p-4">
      <p class="label text-faint">{{ result }}</p>
      <p class="num mt-1.5 text-2xl font-semibold" :class="accent">
        Rs {{ lkr == null ? DASH : money(lkr) }}
      </p>
      <p v-if="bank" class="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-mute">
        <span>at</span>
        <img :src="icon(id!)" alt="" class="h-4 w-4 rounded-[3px] object-contain" loading="lazy" />
        <span class="font-semibold text-ink">{{ bank }}</span>
        <span>&middot; {{ rate(best?.v) }} per dollar</span>
      </p>
    </div>

    <p v-if="diff != null && worstName" class="mt-3 text-[13px] leading-snug text-mute">
      The same {{ mode === 'buy' ? 'purchase' : 'sale' }} at
      <span class="font-semibold text-ink">{{ worstName }}</span>, the weakest bank on the board,
      would {{ mode === 'buy' ? 'cost' : 'return' }}
      <span class="num text-ink">Rs {{ money(lost) }}</span>
      &mdash; a difference of
      <span class="num font-semibold" :class="accent">Rs {{ money(diff) }}</span
      >.
    </p>
  </section>
</template>

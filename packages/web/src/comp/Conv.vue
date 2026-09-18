<script setup lang="ts">
import { pick } from '@fxtrack/shared'
import { computed } from 'vue'
import { CARD_MARKUP, DCC_MARKUP } from '../lib/fees'
import { DASH, money, pct, rate } from '../lib/fmt'
import { amount, bankMap, best, icon, kind, mode, worst } from '../lib/store'

const PRESETS = [500, 1000, 5000, 25000]

const lkr = computed(() => (best.value ? best.value.v * amount.value : null))
const lost = computed(() => (worst.value ? worst.value.v * amount.value : null))
const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))
const card = computed(() => mode.value === 'buy' && kind.value === 'card')
const base = computed(() => {
  const b = best.value
  if (!b) return null
  return card.value ? pick(b.rate, 'buy', 'tt') : b.v
})
const markup = computed(() => (card.value && base.value != null ? base.value * CARD_MARKUP : null))

const heading = computed(() =>
  mode.value === 'buy' ? 'Dollars you want to buy' : 'Dollars you want to sell',
)
const result = computed(() => (mode.value === 'buy' ? 'It costs you' : 'You receive'))
const intro = computed(() =>
  card.value
    ? 'Estimated from the best TT selling rate plus a typical issuer markup.'
    : 'Priced at the best rate on the board right now.',
)

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
    <p class="mt-0.5 text-[13px] text-mute">{{ intro }}</p>

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

    <div v-if="card && base != null" class="mt-3 rounded-xl border border-line bg-card px-4 py-3.5">
      <div class="flex items-center justify-between gap-4 text-[13px] text-mute">
        <span>Bank TT selling rate</span>
        <span class="num text-ink">Rs {{ rate(base) }}</span>
      </div>
      <div class="mt-2 flex items-center justify-between gap-4 text-[13px] text-mute">
        <span>Typical issuer markup ({{ pct(CARD_MARKUP * 100) }})</span>
        <span class="num text-ink">+ Rs {{ rate(markup) }}</span>
      </div>
      <div class="mt-3 flex items-center justify-between gap-4 border-t border-hair pt-3 text-[13px] font-semibold text-ink">
        <span>Estimated card rate</span>
        <span class="num">Rs {{ rate(best?.v) }} / USD</span>
      </div>
      <p class="mt-2 text-xs leading-snug text-faint">
        No separate network fee, VAT, SSCL or verified stamp-duty line is included.
      </p>
    </div>

    <p v-if="card" class="mt-3 rounded-xl border border-gold/30 bg-gold/8 px-4 py-3 text-[13px] leading-snug text-mute">
      <span class="font-semibold text-ink">Choose USD at checkout.</span>
      Paying in LKR through dynamic currency conversion (DCC) can add at least
      <span class="num text-ink">{{ pct(DCC_MARKUP * 100) }}</span>
      plus the merchant's own exchange spread. It is a separate conversion path, not an extra line
      on this estimate.
    </p>

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

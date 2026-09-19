<script setup lang="ts">
import { pick } from '@fxtrack/shared'
import { computed } from 'vue'
import { CARD_MARKUP, DCC_MARKUP } from '../lib/fees'
import { DASH, money, pct, rate } from '../lib/fmt'
import { amount, bankMap, bestRows, compareRows, icon, kind, mode, picks } from '../lib/store'

const PRESETS = [500, 1000, 5000, 25000]

const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))
const card = computed(() => mode.value === 'buy' && kind.value === 'card')

const heading = computed(() =>
  mode.value === 'buy' ? 'Dollars you want to buy' : 'Dollars you want to sell',
)
const result = computed(() => (mode.value === 'buy' ? 'It costs you' : 'You receive'))
const intro = computed(() =>
  card.value
    ? 'Estimated from the best TT selling rate plus a typical issuer markup.'
    : 'Priced at the best rate on the board right now.',
)

const quotes = computed(() =>
  compareRows.value.map((row) => {
    const base = card.value ? pick(row.rate, 'buy', 'tt') : row.v
    return {
      row,
      name: bankMap.value.get(row.rate.bank)?.name ?? row.rate.bank,
      base,
      markup: card.value && base != null ? base * CARD_MARKUP : null,
      total: row.v * amount.value,
      leader: bestRows.value.some((r) => r.rate.bank === row.rate.bank),
      selected: picks.value.includes(row.rate.bank),
    }
  }),
)

function set(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  amount.value = Number.isFinite(v) && v > 0 ? v : 0
}
</script>

<template>
  <section class="card rise p-5 sm:p-6">
    <h2 class="text-lg font-semibold text-ink">Converter</h2>
    <p class="mt-0.5 text-sm text-mute">{{ intro }}</p>

    <label class="label mt-5 block text-soft">{{ heading }}</label>
    <div
      class="mt-2 flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-wash px-3.5 py-2.5 transition focus-within:border-brand/60 focus-within:bg-card"
    >
      <span class="ui text-sm text-soft">$</span>
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
            ? 'border-brand/45 bg-brand/8 text-clay-strong'
            : 'border-line text-mute hover:border-faint/60 hover:text-ink'
        "
        @click="amount = p"
      >
        ${{ money(p) }}
      </button>
    </div>

    <div class="mt-5 rounded-[var(--radius-card)] border border-hair bg-wash p-4">
      <p class="label text-soft">{{ result }}</p>
      <div v-if="quotes.length" class="mt-2.5 divide-y divide-hair">
        <div v-for="q in quotes" :key="q.row.rate.bank" class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div class="flex min-w-0 items-center gap-2">
            <img :src="icon(q.row.rate.bank)" alt="" class="h-5 w-5 shrink-0 rounded-[4px] object-contain" loading="lazy" />
            <div class="min-w-0">
              <p class="truncate font-medium text-ink">
                {{ q.name }}
                <span v-if="q.leader" class="label ml-1 rounded-full bg-gold/10 px-1.5 py-1 text-gold">Best</span>
                <span v-if="q.selected" class="label ml-1 rounded-full bg-brand/8 px-1.5 py-1 text-clay-strong">Selected</span>
              </p>
              <p class="num text-xs text-soft">{{ rate(q.row.v) }} per USD</p>
            </div>
          </div>
          <p class="num shrink-0 text-lg font-semibold" :class="accent">Rs {{ money(q.total) }}</p>
        </div>
      </div>
      <p v-else class="num mt-1.5 text-2xl font-semibold text-soft">{{ DASH }}</p>
    </div>

    <div v-if="card && quotes.length" class="mt-3 card border-line bg-card px-4 py-3.5">
      <p class="label text-soft">Card rate estimate</p>
      <div class="mt-2 divide-y divide-hair">
        <div v-for="q in quotes" :key="q.row.rate.bank" class="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0 text-sm text-mute">
          <span class="truncate">{{ q.name }}</span>
          <span class="num shrink-0 text-ink">
            {{ q.base == null ? DASH : `Rs ${rate(q.base)} + ${rate(q.markup)} = ${rate(q.row.v)}` }}
          </span>
        </div>
      </div>
      <p class="mt-2 text-xs leading-snug text-soft">
        No separate network fee, VAT, SSCL or verified stamp-duty line is included.
      </p>
    </div>

    <p v-if="card" class="mt-3 card border-gold/30 bg-gold/8 px-4 py-3 text-sm leading-snug text-mute">
      <span class="font-semibold text-ink">Choose USD at checkout.</span>
      Paying in LKR through dynamic currency conversion (DCC) can add at least
      <span class="num text-ink">{{ pct(DCC_MARKUP * 100) }}</span>
      plus the merchant's own exchange spread. It is a separate conversion path, not an extra line
      on this estimate.
    </p>
  </section>
</template>

<script setup lang="ts">
import { pick } from '@fxtrack/shared'
import { computed } from 'vue'
import { ago, DASH, rate } from '../lib/fmt'
import { bankMap, icon, kind, latest, mode, picks, rows, tint, toggle } from '../lib/store'

const head = computed(() => (mode.value === 'buy' ? 'You pay' : 'You get'))
const accent = computed(() => (mode.value === 'buy' ? 'text-buy' : 'text-sell'))

const on = (id: string) => picks.value.includes(id)

function name(id: string): string {
  return bankMap.value.get(id)?.name ?? id
}

function url(id: string): string | null {
  return bankMap.value.get(id)?.url ?? null
}

/** Banks we track that simply do not publish this rate (e.g. Sampath has no cash selling). */
const missing = computed(() => {
  const l = latest.value
  if (!l) return []
  return l.rates
    .filter((r) => bankMap.value.get(r.bank)?.kind === 'bank' && pick(r, mode.value, kind.value) == null)
    .map((r) => name(r.bank))
})

const LIST = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })
const list = (a: string[]) => LIST.format(a)

const cbsl = computed(() => latest.value?.rates.find((r) => bankMap.value.get(r.bank)?.kind === 'cb') ?? null)

const sub = computed(() =>
  kind.value === 'card'
    ? 'Lowest estimated card cost first. Tap any bank to add it to the chart.'
    : mode.value === 'buy'
    ? 'Cheapest dollars first. Tap any bank to add it to the chart.'
    : 'Most rupees first. Tap any bank to add it to the chart.',
)
</script>

<template>
  <section class="card rise overflow-hidden">
    <div class="px-5 pt-5 sm:px-6">
      <h2 class="text-lg font-semibold text-ink">Every bank, ranked</h2>
      <p class="mt-0.5 text-[13px] text-mute">{{ sub }}</p>
    </div>

    <div class="mt-4 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="label border-y border-hair bg-wash/60 text-faint">
            <th class="py-2.5 pl-5 pr-3 text-left font-medium sm:pl-6">Bank</th>
            <th class="px-3 py-2.5 text-right font-medium">{{ head }}</th>
            <th class="px-3 py-2.5 text-right font-medium">Vs best</th>
            <th class="py-2.5 pl-3 pr-5 text-right font-medium sm:pr-6">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in rows"
            :key="r.rate.bank"
            class="cursor-pointer border-b border-hair transition last:border-0 hover:bg-wash"
            :class="on(r.rate.bank) && 'bg-wash'"
            @click="toggle(r.rate.bank)"
          >
            <td class="py-3 pl-5 pr-3 sm:pl-6">
              <div class="flex items-center gap-2.5">
                <span
                  class="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition"
                  :class="on(r.rate.bank) ? 'border-transparent' : 'border-line'"
                  :style="on(r.rate.bank) ? { background: tint.get(r.rate.bank) } : undefined"
                >
                  <svg
                    v-if="on(r.rate.bank)"
                    viewBox="0 0 12 12"
                    class="h-2.5 w-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2.5 6.5 5 9l4.5-5.5" />
                  </svg>
                </span>

                <span
                  class="num w-3 shrink-0 text-xs"
                  :class="i === 0 ? 'text-gold' : 'text-faint'"
                >{{ i + 1 }}</span>

                <img
                  :src="icon(r.rate.bank)"
                  alt=""
                  class="h-5 w-5 shrink-0 rounded-[5px] object-contain"
                  loading="lazy"
                />

                <a
                  v-if="url(r.rate.bank)"
                  :href="url(r.rate.bank)!"
                  target="_blank"
                  rel="noreferrer"
                  class="font-medium text-ink transition hover:text-brand"
                  @click.stop
                >{{ name(r.rate.bank) }}</a>
                <span v-else class="font-medium text-ink">{{ name(r.rate.bank) }}</span>
              </div>
            </td>

            <td class="num px-3 py-3 text-right" :class="i === 0 ? accent : 'text-ink'">
              {{ rate(r.v) }}
            </td>

            <td class="num px-3 py-3 text-right text-xs text-faint">
              {{ r.gap === 0 ? 'best' : `+${rate(r.gap)}` }}
            </td>

            <td class="ui py-3 pl-3 pr-5 text-right text-xs text-faint sm:pr-6">
              {{ ago(r.rate.ts) }}
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td colspan="4" class="px-6 py-10 text-center text-sm text-faint">
              No rates available.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="cbsl || missing.length"
      class="space-y-2 border-t border-hair bg-wash/50 px-5 py-4 text-[13px] leading-snug text-mute sm:px-6"
    >
      <p v-if="cbsl">
        Central Bank indicative mid rate
        <span class="num text-ink">{{ cbsl.mid == null ? DASH : rate(cbsl.mid) }}</span>
        &middot; a reference for where the market sits, not a price you can deal at.
      </p>
      <p v-if="missing.length">
        {{ list(missing) }} {{ missing.length > 1 ? 'do' : 'does' }} not publish this
        particular rate, so {{ missing.length > 1 ? 'they are' : 'it is' }} not listed here.
      </p>
      <p class="text-faint">
        Rates shown are for {{ rows.length }}
        {{ rows.length === 1 ? 'bank' : 'banks' }} currently reporting.
      </p>
    </div>
  </section>
</template>

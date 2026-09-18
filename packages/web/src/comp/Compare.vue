<script setup lang="ts">
import { field } from '@fxtrack/shared'
import { computed } from 'vue'
import { delta, DASH, rate } from '../lib/fmt'
import { quote } from '../lib/fees'
import {
  bankMap,
  bestRows,
  hist,
  icon,
  kind,
  mode,
  picks,
  rows,
  win,
  winDays,
  WINDOWS,
} from '../lib/store'
import { stat, type Row, type Stat } from '../lib/stats'

interface Item {
  row: Row
  stat: Stat
  leader: boolean
  selected: boolean
}

const winLabel = computed(() => WINDOWS.find((w) => w.id === win.value)?.label ?? '')

const focus = computed(() => {
  const out: Row[] = []
  const seen = new Set<string>()
  for (const r of [...bestRows.value, ...rows.value.filter((r) => picks.value.includes(r.rate.bank))]) {
    if (seen.has(r.rate.bank)) continue
    seen.add(r.rate.bank)
    out.push(r)
  }
  return out
})

const items = computed<Item[]>(() => {
  const h = hist.value
  const f = field(mode.value, kind.value)
  return focus.value.map((row) => {
    const raw = h?.ser[row.rate.bank]?.[f] ?? []
    const vals = raw.map((v) => (v == null ? null : quote(v, kind.value)))
    return {
      row,
      stat: stat(vals, winDays.value),
      leader: bestRows.value.some((r) => r.rate.bank === row.rate.bank),
      selected: picks.value.includes(row.rate.bank),
    }
  })
})
</script>

<template>
  <section v-if="items.length" class="card rise overflow-hidden">
    <div class="px-5 pt-5 sm:px-6">
      <h2 class="text-lg font-semibold text-ink">Best + selected banks</h2>
      <p class="mt-0.5 text-[13px] text-mute">
        Current and {{ winLabel }} stats for every tied-best bank and each bank you selected below.
      </p>
    </div>

    <div class="mt-4 overflow-x-auto">
      <table class="w-full min-w-[680px] text-sm">
        <thead>
          <tr class="label border-y border-hair bg-wash/60 text-faint">
            <th class="py-2.5 pl-5 pr-3 text-left font-medium sm:pl-6">Bank</th>
            <th class="px-3 py-2.5 text-right font-medium">Now</th>
            <th class="px-3 py-2.5 text-right font-medium">Low</th>
            <th class="px-3 py-2.5 text-right font-medium">High</th>
            <th class="px-3 py-2.5 text-right font-medium">Average</th>
            <th class="py-2.5 pl-3 pr-5 text-right font-medium sm:pr-6">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.row.rate.bank" class="border-b border-hair last:border-0">
            <td class="py-3 pl-5 pr-3 sm:pl-6">
              <div class="flex items-center gap-2.5">
                <img
                  :src="icon(item.row.rate.bank)"
                  alt=""
                  class="h-5 w-5 shrink-0 rounded-[5px] object-contain"
                  loading="lazy"
                />
                <span class="font-medium text-ink">{{ bankMap.get(item.row.rate.bank)?.name ?? item.row.rate.bank }}</span>
                <span v-if="item.leader" class="label rounded-full bg-gold/10 px-1.5 py-1 text-gold">Best</span>
                <span v-if="item.selected" class="label rounded-full bg-brand/8 px-1.5 py-1 text-brand">Selected</span>
              </div>
            </td>
            <td class="num px-3 py-3 text-right font-semibold text-ink">{{ rate(item.row.v) }}</td>
            <td class="num px-3 py-3 text-right text-mute">{{ item.stat.min == null ? DASH : rate(item.stat.min) }}</td>
            <td class="num px-3 py-3 text-right text-mute">{{ item.stat.max == null ? DASH : rate(item.stat.max) }}</td>
            <td class="num px-3 py-3 text-right text-mute">{{ item.stat.avg == null ? DASH : rate(item.stat.avg) }}</td>
            <td class="num py-3 pl-3 pr-5 text-right text-mute sm:pr-6">{{ item.stat.chg == null ? DASH : delta(item.stat.chg) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

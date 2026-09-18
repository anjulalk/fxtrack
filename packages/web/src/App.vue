<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Chart from './comp/Chart.vue'
import Conv from './comp/Conv.vue'
import Hero from './comp/Hero.vue'
import Ranks from './comp/Ranks.vue'
import { clock } from './lib/fmt'
import { busy, err, kind, latest, load, mode } from './lib/store'

const MODES = [
  { id: 'buy', label: "I'm buying USD", hint: 'You pay LKR for dollars' },
  { id: 'sell', label: "I'm selling USD", hint: 'You get LKR for dollars' },
] as const

const KINDS = [
  { id: 'tt', label: 'Wire / transfer' },
  { id: 'note', label: 'Cash notes' },
] as const

const stamp = computed(() => {
  const t = latest.value?.gen
  return t ? clock(t) : null
})

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          fx<span class="text-brand">track</span>
        </h1>
        <p class="mt-0.5 text-sm text-ink-400">US Dollar to Sri Lankan Rupee</p>
      </div>
      <p v-if="stamp" class="text-xs text-ink-500">
        Updated {{ stamp }}
        <span class="text-ink-600">· Colombo time</span>
      </p>
    </header>

    <div class="mt-6 grid gap-2 sm:grid-cols-2">
      <button
        v-for="m in MODES"
        :key="m.id"
        type="button"
        class="card rounded-xl px-4 py-3.5 text-left transition"
        :class="
          mode === m.id
            ? m.id === 'buy'
              ? 'border-buy/40! bg-buy/8!'
              : 'border-sell/40! bg-sell/8!'
            : 'opacity-55 hover:opacity-85'
        "
        @click="mode = m.id"
      >
        <span
          class="block text-sm font-semibold"
          :class="mode === m.id ? (m.id === 'buy' ? 'text-buy' : 'text-sell') : 'text-ink-200'"
        >{{ m.label }}</span>
        <span class="mt-0.5 block text-xs text-ink-400">{{ m.hint }}</span>
      </button>
    </div>

    <div class="mt-3 flex rounded-lg border border-white/8 bg-ink-900/60 p-0.5 sm:w-fit">
      <button
        v-for="k in KINDS"
        :key="k.id"
        type="button"
        class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none"
        :class="kind === k.id ? 'bg-white/10 text-ink-100' : 'text-ink-400 hover:text-ink-200'"
        @click="kind = k.id"
      >
        {{ k.label }}
      </button>
    </div>

    <div v-if="err" class="card mt-6 border-down/30! p-5 text-sm">
      <p class="font-medium text-down">Could not load rates</p>
      <p class="mt-1 text-ink-400">{{ err }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ink-200 hover:bg-white/5"
        @click="load"
      >
        Try again
      </button>
    </div>

    <div v-else-if="busy" class="card mt-6 animate-pulse p-8 text-center text-sm text-ink-500">
      Loading rates…
    </div>

    <main v-else class="mt-6 space-y-5">
      <Hero />
      <Chart />
      <div class="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Ranks />
        <Conv />
      </div>
    </main>

    <footer class="mt-10 border-t border-white/5 pt-5 text-xs leading-relaxed text-ink-600">
      Rates are scraped hourly from each bank's public website and may lag their counters.
      Always confirm with the bank before transacting.
    </footer>
  </div>
</template>

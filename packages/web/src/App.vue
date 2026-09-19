<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Compare from './comp/Compare.vue'
import Chart from './comp/Chart.vue'
import Conv from './comp/Conv.vue'
import Hero from './comp/Hero.vue'
import Ranks from './comp/Ranks.vue'
import { clock } from './lib/fmt'
import { busy, err, kind, latest, load, mode } from './lib/store'

const MODES = [
  {
    id: 'buy',
    label: "I'm buying dollars",
    hint: 'You hand over rupees. The bank\u2019s selling rate applies, so lower is better.',
  },
  {
    id: 'sell',
    label: "I'm selling dollars",
    hint: 'You receive rupees. The bank\u2019s buying rate applies, so higher is better.',
  },
] as const

const KINDS = [
  { id: 'tt', label: 'Wire / transfer', buyOnly: false },
  { id: 'note', label: 'Cash notes', buyOnly: false },
  { id: 'card', label: 'Card payment', buyOnly: true },
] as const

const kinds = computed(() => KINDS.filter((k) => !k.buyOnly || mode.value === 'buy'))

const stamp = computed(() => {
  const t = latest.value?.gen
  return t ? clock(t) : null
})

const NOTES: Record<string, string> = {
  tt: 'Telegraphic transfers and inward remittances. Banks almost always price these better than physical currency.',
  note: 'Physical notes over the counter. Expect a wider spread than a wire for the same day.',
  card: 'Paying a foreign merchant with a Sri Lankan card. The rate below is an estimate with the typical issuer markup included.',
}

const note = computed(() => NOTES[kind.value]!)

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[80rem] px-6 pt-6 sm:px-14 sm:pt-10 md:px-24 lg:px-32">
    <header class="pb-6 sm:pb-10">
      <div class="flex flex-wrap items-baseline justify-between gap-4">
        <h1 class="ui text-xl font-semibold">
          fx<span class="text-clay-strong">track</span>
        </h1>
        <p v-if="stamp" class="ui shrink-0 text-sm text-mute">
          Last checked {{ stamp }} <span class="text-mute">&middot; Colombo time</span>
        </p>
      </div>
    </header>

    <p class="text-lg text-ink">Every bank's US dollar rate in Sri Lanka, in one place.</p>

    <p class="mt-5 max-w-2xl text-mute">
      Banks quote two different prices for the same dollar, and on any given day the gap
      between the best and worst bank is wide enough to be worth a short detour. Pick the
      side of the trade you are on and every rate below reorders around it.
    </p>

    <div class="mt-7 grid gap-2.5 sm:grid-cols-2">
      <button
        v-for="m in MODES"
        :key="m.id"
        type="button"
        class="card px-4 py-3.5 text-left transition"
        :class="
          mode === m.id
            ? m.id === 'buy'
              ? 'border-buy/45! bg-buy/6!'
              : 'border-sell/45! bg-sell/6!'
            : 'opacity-70 hover:opacity-100 hover:border-faint/45!'
        "
        @click="mode = m.id"
      >
        <span
          class="block text-base font-semibold"
          :class="mode === m.id ? (m.id === 'buy' ? 'text-buy' : 'text-sell') : 'text-ink'"
        >{{ m.label }}</span>
        <span class="mt-1 block text-sm leading-snug text-mute">{{ m.hint }}</span>
      </button>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="flex rounded-lg border border-line bg-wash p-0.5">
        <button
          v-for="k in kinds"
          :key="k.id"
          type="button"
          class="ui rounded-md px-3 py-1.5 text-xs font-medium transition"
          :class="
            kind === k.id
              ? 'bg-card text-ink shadow-sm'
              : 'text-mute hover:text-ink'
          "
          @click="kind = k.id"
        >
          {{ k.label }}
        </button>
      </div>
      <p class="max-w-md text-sm leading-snug text-soft">{{ note }}</p>
    </div>

    <div v-if="err" class="card mt-7 border-down/35! p-5 text-sm">
      <p class="font-semibold text-down">Could not load rates</p>
      <p class="mt-1 text-mute">{{ err }}</p>
      <button
        type="button"
        class="ui mt-3 rounded-lg border border-line px-3 py-1.5 text-xs text-ink transition hover:bg-wash"
        @click="load"
      >
        Try again
      </button>
    </div>

    <div v-else-if="busy" class="card mt-7 animate-pulse p-10 text-center text-sm text-soft">
      Loading rates…
    </div>

    <main v-else class="mt-7 space-y-5">
      <Hero />
      <Compare />
      <Chart />
      <Conv />
      <Ranks />
    </main>

    <footer class="ui py-10 text-sm text-soft">
      <p>
        Built by
        <a
          class="underline-offset-2 hover:text-ink hover:underline"
          href="https://anjula.dev"
          target="_blank"
          rel="noreferrer"
          >Anjula Karunarathne</a
        >.
      </p>
      <p class="text-xs">
        An independent project, not affiliated with, endorsed by, or operated by any bank listed.
        Bank names and marks belong to their respective owners and are used only to identify the
        source of each rate. Published rates are indicative, so confirm them with the bank before
        transacting.
      </p>
    </footer>
  </div>
</template>

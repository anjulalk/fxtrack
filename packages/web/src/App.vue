<script setup lang="ts">
import { computed, onMounted } from 'vue'
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
  <div class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="border-b border-line pb-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            fx<span class="text-brand">track</span>
          </h1>
          <p class="mt-1.5 text-lg text-mute">
            Every bank's US dollar rate in Sri Lanka, in one place.
          </p>
        </div>
        <p v-if="stamp" class="ui shrink-0 text-xs text-faint">
          Last checked {{ stamp }} <span class="text-faint/80">&middot; Colombo time</span>
        </p>
      </div>

      <p class="mt-5 max-w-2xl text-[15px] leading-relaxed text-mute">
        Banks quote two different prices for the same dollar, and on any given day the gap
        between the best and worst bank is wide enough to be worth a short detour. Pick the
        side of the trade you are on and every rate below reorders around it.
      </p>
    </header>

    <div class="mt-7 grid gap-2.5 sm:grid-cols-2">
      <button
        v-for="m in MODES"
        :key="m.id"
        type="button"
        class="card rounded-xl px-4 py-3.5 text-left transition"
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
        <span class="mt-1 block text-[13px] leading-snug text-mute">{{ m.hint }}</span>
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
      <p class="max-w-md text-[13px] leading-snug text-faint">{{ note }}</p>
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

    <div v-else-if="busy" class="card mt-7 animate-pulse p-10 text-center text-sm text-faint">
      Loading rates…
    </div>

    <main v-else class="mt-7 space-y-5">
      <Hero />
      <Chart />
      <div class="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Ranks />
        <Conv />
      </div>
    </main>

    <footer class="mt-14 border-t border-line pt-7 text-sm leading-relaxed text-mute">
      <div class="grid gap-7 sm:grid-cols-3">
        <div>
          <h2 class="label text-faint">How this works</h2>
          <p class="mt-2">
            Four times a day a scheduled job reads the published exchange rate page of each
            bank, stores what it finds, and rebuilds this site. Nothing is entered by hand and
            there is no server in between.
          </p>
        </div>
        <div>
          <h2 class="label text-faint">Where the numbers come from</h2>
          <p class="mt-2">
            Only official bank websites and the Central Bank of Sri Lanka. Every bank name in
            the table links back to the page its rate was read from, so you can check it
            yourself.
          </p>
        </div>
        <div>
          <h2 class="label text-faint">Before you transact</h2>
          <p v-if="kind !== 'card'" class="mt-2">
            Published rates are indicative. Counter and branch rates move during the day, large
            amounts are often negotiable, and fees are not included here. Confirm with the bank
            before committing.
          </p>
          <p v-else class="mt-2">
            Card estimates add a 4% issuer markup, the median of published figures in official
            <a class="underline underline-offset-2 hover:text-ink" href="https://www.boc.lk/rates-tariff" target="_blank" rel="noreferrer">BOC</a>,
            <a class="underline underline-offset-2 hover:text-ink" href="https://www.combank.lk/rates-tariff" target="_blank" rel="noreferrer">Commercial Bank</a>,
            <a class="underline underline-offset-2 hover:text-ink" href="https://www.seylan.lk/service-charges" target="_blank" rel="noreferrer">Seylan</a>,
            <a class="underline underline-offset-2 hover:text-ink" href="https://dfccwebstoacc.blob.core.windows.net/dfccweb/uploads/db368b5b-842a-4ba3-9593-12b479d4d4c8/DFCC-Bank-PLC-Tariff-2025-Version-3.0-1.pdf" target="_blank" rel="noreferrer">DFCC</a>
            and People's Bank tariffs. No separate network fee, VAT, SSCL or verified stamp-duty
            line is included. Choose USD at checkout: DCC is a separate fee when a merchant bills
            you in LKR.
          </p>
        </div>
      </div>
      <p class="mt-7 border-t border-hair pt-5 text-xs text-faint">
        fxtrack is an independent project and is not affiliated with, endorsed by, or operated
        by any bank listed. Bank names and marks belong to their respective owners and are used
        only to identify the source of each rate.
      </p>
    </footer>
  </div>
</template>

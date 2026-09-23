'use client'

import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import Image from 'next/image'
import { Share, SquarePlus, X } from 'lucide-react'
import { Modal } from '@/components/modal'
import {
  INSTALL_DISMISSED_KEY,
  isInstallSnoozed,
  isIosDevice,
} from '@/lib/pwa/install'
import logo from '@/app/icon.png'

/**
 * "Add to home screen", offered two ways: a banner that appears on its own
 * above the bottom nav (`InstallBanner`), and a permanent card on the profile
 * for anyone who waved the banner away (`InstallCard`).
 *
 * There is no single cross-browser install button. Chromium hands us a
 * deferred `beforeinstallprompt` event we can fire on a tap; iOS has no API at
 * all and needs the member walked through the share sheet. Both paths run off
 * the same `useInstallAction` hook so the two call sites stay thin.
 */

/** Chromium's install event — non-standard, so not in lib.dom. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform =
  /** Still deciding: nothing renders on the server or the first paint. */
  | 'pending'
  /** Already launched from the home screen — nothing left to offer. */
  | 'installed'
  /** Chromium fired its event: one tap installs. */
  | 'native'
  /** iOS: no API, the member goes through the share sheet. */
  | 'ios'
  /** Desktop Safari, Firefox… — no install path worth advertising. */
  | 'none'

type InstallState = {
  platform: Platform
  /** Whether an earlier dismissal still hides the banner. */
  snoozed: boolean
}

/*
 * Installability lives in a module-level store rather than component state.
 *
 * `beforeinstallprompt` fires once, whenever the browser decides the site is
 * eligible — possibly before the banner has mounted, and certainly only once
 * across the two components that offer the install. A store outlives both,
 * and `useSyncExternalStore` is how React reads a browser fact that is simply
 * not knowable during a server render.
 */

/** Also the server snapshot: assume snoozed so the banner never flashes. */
const INITIAL: InstallState = { platform: 'pending', snoozed: true }

let state: InstallState = INITIAL
let deferredPrompt: BeforeInstallPromptEvent | null = null
let started = false
const listeners = new Set<() => void>()

function publish(next: Partial<InstallState>) {
  state = { ...state, ...next }
  for (const notify of listeners) notify()
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS home-screen apps predate the display-mode media query.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function readDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISSED_KEY)
    return raw === null ? null : Number(raw)
  } catch {
    // Private mode or blocked storage: treat it as never dismissed.
    return null
  }
}

/**
 * Registers `public/sw.js`, whose only job is to make the app installable —
 * Chromium still wants a fetch handler before it will fire
 * `beforeinstallprompt`. See the comment at the top of that file.
 *
 * `updateViaCache: 'none'` keeps the browser from serving the worker script
 * out of the HTTP cache, so a new version is picked up on the next visit.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
    // Installability is a bonus, never a reason to break the page.
  })
}

/**
 * Detects the platform and starts listening, once, on the first subscriber.
 * The listeners are deliberately never removed: they belong to the page, not
 * to whichever component happened to mount first.
 */
function start() {
  if (started) return
  started = true

  registerServiceWorker()

  if (isStandalone()) {
    publish({ platform: 'installed' })
    return
  }

  publish({
    // The starting guess, upgraded to 'native' if Chromium offers its event.
    platform: isIosDevice(navigator.userAgent, navigator.maxTouchPoints)
      ? 'ios'
      : 'none',
    snoozed: isInstallSnoozed(readDismissedAt(), Date.now()),
  })

  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppresses Chromium's own mini-infobar so our banner is the single,
    // styled place the offer is made.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    publish({ platform: 'native' })
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    publish({ platform: 'installed' })
  })
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  start()

  return () => {
    listeners.delete(onChange)
  }
}

function useInstallState(): InstallState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  )
}

function dismissBanner() {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()))
  } catch {
    // Nothing to do — worst case the banner comes back on the next visit.
  }

  publish({ snoozed: true })
}

/**
 * The one thing a call site needs: whether to show anything, what the button
 * says, what tapping it does, and the iOS modal to render alongside it.
 */
function useInstallAction() {
  const { platform, snoozed } = useInstallState()
  const [iosStepsOpen, setIosStepsOpen] = useState(false)

  const run = useCallback(async () => {
    if (platform === 'ios') {
      setIosStepsOpen(true)
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    // The event is single-use; Chromium fires a fresh one if the member is
    // still eligible on a later visit.
    deferredPrompt = null
  }, [platform])

  return {
    available: platform === 'native' || platform === 'ios',
    snoozed,
    label: platform === 'ios' ? 'Comment faire' : 'Installer',
    run,
    iosSteps: iosStepsOpen ? (
      <IosInstructions onClose={() => setIosStepsOpen(false)} />
    ) : null,
  }
}

/**
 * Floating offer above the bottom nav, for members who have never installed.
 *
 * Dismissing it snoozes rather than silences it (see `INSTALL_SNOOZE_MS`) —
 * and the profile card is there in the meantime for anyone who changes their
 * mind sooner.
 */
export function InstallBanner() {
  const { available, snoozed, label, run, iosSteps } = useInstallAction()

  if (snoozed || !available) return null

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-20 px-5">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-court/50 bg-shuttle/95 p-3 shadow-lg backdrop-blur">
          <Image
            src={logo}
            alt=""
            className="size-10 shrink-0 rounded-xl object-contain"
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-shuttle-text">
              Installer BetClichy
            </p>
            <p className="text-xs leading-snug text-shuttle-text-soft">
              L&rsquo;appli sur votre écran d&rsquo;accueil, sans passer par le
              navigateur.
            </p>
          </div>

          <button
            type="button"
            onClick={run}
            className="shrink-0 rounded-xl bg-court px-3 py-2 text-sm font-semibold text-ink transition-opacity active:opacity-80"
          >
            {label}
          </button>

          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Plus tard"
            className="-mr-1 shrink-0 self-start rounded-full p-1 text-shuttle-text-soft transition-colors active:bg-shuttle-text/10"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {iosSteps}
    </>
  )
}

/**
 * The same offer as a plain card, for the profile. Available for as long as
 * the app is not installed, so dismissing the banner is never a dead end.
 */
export function InstallCard() {
  const { available, label, run, iosSteps } = useInstallAction()

  if (!available) return null

  return (
    <section className="rounded-2xl border border-line bg-sheet p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-soft">Application</p>
          <p className="mt-0.5 font-medium text-ink">Installer sur le téléphone</p>
        </div>

        <button
          type="button"
          onClick={run}
          className="shrink-0 rounded-xl bg-court px-3 py-2 text-sm font-semibold text-ink transition-opacity active:opacity-80"
        >
          {label}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        Ajoute une icône sur l&rsquo;écran d&rsquo;accueil et ouvre BetClichy en
        plein écran, sans barre d&rsquo;adresse.
      </p>

      {iosSteps}
    </section>
  )
}

/**
 * iOS cannot be prompted, so this walkthrough is the whole install flow there:
 * the exact taps, with the share-sheet glyphs the member is looking for.
 */
function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Ajouter BetClichy à l’écran d’accueil" onClose={onClose}>
      <ol className="space-y-4 text-sm leading-relaxed text-ink-soft">
        <StepRow index={1}>
          Touchez <Share aria-hidden className="inline size-4 -translate-y-0.5" />{' '}
          <span className="font-medium text-ink">Partager</span> dans la barre
          du navigateur.
        </StepRow>

        <StepRow index={2}>
          Faites défiler, puis choisissez{' '}
          <SquarePlus aria-hidden className="inline size-4 -translate-y-0.5" />{' '}
          <span className="font-medium text-ink">
            Sur l&rsquo;écran d&rsquo;accueil
          </span>
          .
        </StepRow>

        <StepRow index={3}>
          Confirmez avec <span className="font-medium text-ink">Ajouter</span> —
          l&rsquo;icône apparaît avec vos autres applis.
        </StepRow>
      </ol>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity active:opacity-80"
      >
        J&rsquo;ai compris
      </button>
    </Modal>
  )
}

function StepRow({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-court text-xs font-bold text-ink">
        {index}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

"use client";

/**
 * ============================================================================
 * Break The Loop, argued from scratch.
 * ============================================================================
 *
 * This is not a restyle of the existing app. It is a different answer to the
 * question the existing app is asking, and the differences are deliberate.
 *
 * The disagreement, stated plainly:
 *
 *   The current app is a slot machine wearing the costume of an anti-slot-
 *   machine app. You press a big round button, it rolls a rarity — common,
 *   rare, legendary — and pays out a dare worth a number of points. Points
 *   accumulate into levels with names. Levels are displayed on a leaderboard.
 *   A streak counts the days and punishes you for missing one. Completion
 *   requires a photo, which goes to a public feed and collects reaction
 *   counters.
 *
 *   Every one of those is a mechanic borrowed from the products this app
 *   exists to rescue you from: variable-ratio reward, points, levels, social
 *   comparison, loss aversion, performance metrics. The app says "break the
 *   loop" and then builds a loop, and hopes you like its loop better.
 *
 * So this version removes all of it — XP, ranks, badges, streaks, rarity,
 * reaction counts — and asks what is actually left that is worth having.
 *
 * What is left is the only genuinely scarce thing in the whole product:
 * Mumbaikars know things about Mumbai that no listings site does. That is the
 * asset. Everything here is built around it.
 *
 * The design consequences:
 *
 *   1. No dice. You say how long you have and whether you'll travel; the app
 *      already knows the hour, the day and the season. It returns a few real
 *      options that fit, with the reason each one surfaced. You choose. People
 *      go out when they chose the thing — being assigned a task by an app is
 *      not a reason to leave the house.
 *
 *   2. Somewhere shut is not a suggestion. Neither is an outdoor plan in the
 *      rain, in a city with a four-month monsoon. The old generator knew
 *      neither and would cheerfully send you to a dawn fish market at 11pm.
 *
 *   3. Out Mode. Once you have picked, the app's job is to stop. One line, one
 *      directions link, and an instruction to put the phone away. The minutes
 *      count up quietly because you might want them later, not to watch.
 *
 *   4. The reward is the record, not a score. A ladder of Mumbai filling in
 *      south to north, and your own journal. Nothing to farm, nothing that
 *      decays if you skip a month, nothing to compare against anyone.
 *
 *   5. Friends are for going with, not for scoring against. One tap asks one
 *      person if they're free. What they've been to is a quiet list with no
 *      numbers on it.
 *
 *   6. Photos are optional, private by default, and asked for after you get
 *      home — not a gate that forces your phone out mid-experience.
 *
 *   7. Contributing a place is one of four things in the navigation, because
 *      it is the thing that makes the product worth anything.
 *
 * The old experience is preserved at /classic on this branch so the two can be
 * compared on one deployment.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SPOTS, travelMinutes, type Area } from "./lib/spots";
import { offers as computeOffers, type Ask as AskShape, type Context, type Offer } from "./lib/pick";
import { load, save, visitedIds, type LogEntry, type V2State } from "./lib/store";
import Ask from "./components/Ask";
import Offers from "./components/Offers";
import OutMode from "./components/OutMode";
import BackFrom from "./components/BackFrom";
import Log from "./components/Log";
import People from "./components/People";
import AddSpot from "./components/AddSpot";
import { IBook, IUsers, IPlus, IPin } from "./components/Icons";

type Screen = "ask" | "offers" | "out" | "back" | "log" | "people" | "add";

const nowContext = (): Context => {
  const d = new Date();
  return { hour: d.getHours(), day: d.getDay(), month: d.getMonth() + 1, raining: false };
};

export default function App() {
  const [state, setState] = useState<V2State>(() => load());
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("ask");
  const [ctx, setCtx] = useState<Context>(() => ({ hour: 19, day: 5, month: 1, raining: false }));
  const [ask, setAsk] = useState<AskShape>({
    budget: "hour",
    travel: "any",
    from: "Dadar",
    withSomeone: false,
    kinds: [],
  });
  const [page, setPage] = useState(0);
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [leftAt, setLeftAt] = useState<string>("");
  const [wasOut, setWasOut] = useState(0);

  // Read storage and the clock after mount so the server and client render the
  // same markup. Doing this in a state initialiser instead would be a
  // hydration mismatch, because neither localStorage nor the local time exists
  // on the server. The lint rule is warning about cascading renders, which is
  // the right warning in general and the wrong one here: this runs once, on
  // mount, to sync with an external store.
  useEffect(() => {
    const loaded = load();
    const clock = nowContext();
    // One batched update rather than four, so it is a single re-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loaded);
    setAsk((a) => ({ ...a, from: loaded.home }));
    setCtx(clock);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: V2State) => {
    setState(next);
    save(next);
  }, []);

  const visited = useMemo(() => visitedIds(state), [state]);
  const current = useMemo(
    () => computeOffers(ask, ctx, visited, page),
    [ask, ctx, visited, page]
  );

  const goOut = (offer: Offer) => {
    setChosen(offer);
    setLeftAt(new Date().toISOString());
    setScreen("out");
  };

  const goToSpotId = (spotId: string) => {
    const spot = SPOTS.find((s) => s.id === spotId);
    if (!spot) return;
    const travel = travelMinutes(spot, ask.from);
    goOut({ spot, travel, total: travel + spot.minutes, because: "A friend went" });
  };

  const finish = (note: string, shared: boolean) => {
    if (!chosen) return;
    const entry: LogEntry = {
      id: `${chosen.spot.id}-${Date.now()}`,
      spotId: chosen.spot.id,
      spotName: chosen.spot.name,
      area: chosen.spot.area,
      at: new Date().toISOString(),
      minutes: wasOut,
      note: note || undefined,
      shared,
    };
    persist({ ...state, log: [entry, ...state.log] });
    setChosen(null);
    setScreen("log");
  };

  const setHome = (from: Area) => {
    setAsk((a) => ({ ...a, from }));
    persist({ ...state, home: from });
  };

  // Out Mode owns the whole screen. Nothing to navigate to is the point.
  if (screen === "out" && chosen) {
    return (
      <Shell bare>
        <OutMode
          offer={chosen}
          since={leftAt}
          onBack={(mins) => {
            setWasOut(mins);
            setScreen("back");
          }}
        />
      </Shell>
    );
  }

  if (screen === "back" && chosen) {
    return (
      <Shell bare>
        <BackFrom
          offer={chosen}
          minutes={wasOut}
          onSave={finish}
          onSkip={() => {
            setChosen(null);
            setScreen("ask");
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell nav={screen} onNav={(s) => setScreen(s)}>
      {screen === "ask" && (
        <Ask
          ask={ask}
          ctx={ctx}
          visited={visited}
          onChange={(next) => {
            if (next.from !== ask.from) setHome(next.from);
            else setAsk(next);
          }}
          onContext={setCtx}
          onSubmit={() => {
            setPage(0);
            setScreen("offers");
          }}
        />
      )}

      {screen === "offers" && (
        <Offers
          offers={current}
          onPick={goOut}
          onMore={() => setPage((p) => p + 1)}
          onBack={() => setScreen("ask")}
          exhausted={current.length < 3}
        />
      )}

      {screen === "log" && <Log state={state} onStart={() => setScreen("ask")} />}

      {screen === "people" && <People onGoTo={goToSpotId} />}

      {screen === "add" && (
        <AddSpot
          defaultArea={ask.from}
          onDone={(name) => {
            persist({ ...state, contributed: [...state.contributed, name] });
            setScreen("ask");
          }}
          onCancel={() => setScreen("ask")}
        />
      )}

      {!hydrated && <span className="sr-only">Loading your log</span>}
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */

const NAV: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: "ask", label: "Go", icon: <IPin size={18} /> },
  { key: "log", label: "Log", icon: <IBook size={18} /> },
  { key: "people", label: "People", icon: <IUsers size={18} /> },
  { key: "add", label: "Add", icon: <IPlus size={18} /> },
];

function Shell({
  children,
  nav,
  onNav,
  bare,
}: {
  children: React.ReactNode;
  nav?: Screen;
  onNav?: (s: Screen) => void;
  bare?: boolean;
}) {
  return (
    <div className="v2-root min-h-screen">
      <div
        className="mx-auto w-full max-w-[30rem] px-5"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: bare
            ? "max(1.5rem, env(safe-area-inset-bottom))"
            : "calc(5.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>

      {!bare && nav && onNav && (
        <nav
          className="fixed bottom-0 inset-x-0 border-t border-[color:var(--hair)] bg-[color:var(--ink-sunk)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Sections"
        >
          <div className="mx-auto max-w-[30rem] grid grid-cols-4">
            {NAV.map((item) => {
              const active = nav === item.key || (nav === "offers" && item.key === "ask");
              return (
                <button
                  key={item.key}
                  onClick={() => onNav(item.key)}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1 py-3 transition-colors"
                  style={{ color: active ? "var(--taxi)" : "var(--paper-faint)" }}
                >
                  {item.icon}
                  <span className="text-[0.6875rem] font-medium tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

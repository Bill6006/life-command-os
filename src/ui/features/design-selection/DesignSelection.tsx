import { useState } from 'react';
import { ACTION_SCENARIO, SILENCE_SCENARIO } from './scenario';
import { VariantBriefing } from './VariantBriefing';
import { VariantConsole } from './VariantConsole';
import { VariantFocus } from './VariantFocus';
import './variants.css';

/**
 * Phase 3 design selection.
 *
 * Three variants of the **primary command surface only**, over one shared synthetic
 * scenario. No secondary states, no second screen, no third application — the whole
 * point of `LEAN-003` is to choose without building three products.
 *
 * Each variant takes the full viewport including its own navigation, because
 * navigation is one of the six dimensions they are meant to differ on. Judging them
 * inside a shared chrome would hide exactly that difference.
 *
 * **This module is deleted after selection.** Only the chosen variant is expanded.
 */

type VariantId = 'briefing' | 'console' | 'focus';

interface VariantEntry {
  readonly id: VariantId;
  readonly letter: string;
  readonly name: string;
  readonly idea: string;
  readonly differsBy: string;
  readonly costHonestly: string;
}

const VARIANTS: readonly VariantEntry[] = [
  {
    id: 'briefing',
    letter: 'A',
    name: 'Briefing',
    idea: 'Reads top to bottom like a short written briefing. The situation arrives before the answer does.',
    differsBy:
      'Linear hierarchy · low density · large headline with comfortable prose · flat bands with one elevated block · bottom tab bar · complete sentences',
    costHonestly:
      'The move sits below the situation, so on a small screen it may take a short scroll to reach the answer.',
  },
  {
    id: 'console',
    letter: 'B',
    name: 'Console',
    idea: 'Parallel panels read like an instrument. State, change, trajectory, and untreated path are all visible at once.',
    differsBy:
      'Grid hierarchy · high density · compact type with monospace values · layered bordered panels · segmented bar on phone, rail on desktop · terse labelled readouts',
    costHonestly:
      'Density is the risk. It is the variant most likely to drift toward the dashboard the Constitution warns against.',
  },
  {
    id: 'focus',
    letter: 'C',
    name: 'Focus',
    idea: 'One dominant answer fills the first screen. The evidence that produced it sits underneath, folded away.',
    differsBy:
      'Single-decision hierarchy · very low density above the fold · large decision type · one strongly elevated card · minimal header menu · short and decisive',
    costHonestly:
      'Folding the evidence is the risk. The Constitution requires useful intelligence to be visible rather than buried, and this variant tests that line hardest.',
  },
];

export function DesignSelection(): React.JSX.Element {
  const [open, setOpen] = useState<VariantId | null>(null);
  const [quiet, setQuiet] = useState(false);

  const scenario = quiet ? SILENCE_SCENARIO : ACTION_SCENARIO;

  if (open !== null) {
    const entry = VARIANTS.find((variant) => variant.id === open);

    return (
      <div className="variant-overlay">
        <div className="picker">
          <span className="picker-label">variant</span>
          {VARIANTS.map((variant) => (
            <button
              type="button"
              key={variant.id}
              aria-pressed={open === variant.id}
              onClick={() => {
                setOpen(variant.id);
              }}
            >
              {variant.letter}
            </button>
          ))}
          <span className="picker-spacer" />
          <button
            type="button"
            aria-pressed={quiet}
            onClick={() => {
              setQuiet((value) => !value);
            }}
          >
            {quiet ? 'quiet' : 'action'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(null);
            }}
          >
            close
          </button>
        </div>

        <div className="variant-stage">
          {open === 'briefing' ? <VariantBriefing scenario={scenario} /> : null}
          {open === 'console' ? <VariantConsole scenario={scenario} /> : null}
          {open === 'focus' ? <VariantFocus scenario={scenario} /> : null}
        </div>

        <p className="variant-caption">
          Variant {entry?.letter} — {entry?.name}. Synthetic scenario; no intelligence produced
          this.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="panel" aria-labelledby="choose">
        <h2 id="choose">Choose one command surface</h2>
        <p>
          Three variants of the opening surface only, over the same synthetic decision. Open
          each on this phone, then tell me which one to build on. Only the one you pick gets
          expanded.
        </p>
        <p>
          Use the <strong>action / quiet week</strong> toggle inside each variant. A layout that
          only looks right when there is something to recommend is the wrong choice — deliberate
          silence has to look like a conclusion, not a broken screen.
        </p>
      </section>

      {VARIANTS.map((variant) => (
        <section className="panel" key={variant.id} aria-labelledby={`v-${variant.id}`}>
          <h2 id={`v-${variant.id}`}>
            {variant.letter} — {variant.name}
          </h2>
          <p>{variant.idea}</p>
          <p className="variant-differs">{variant.differsBy}</p>
          <p className="variant-cost">
            <strong>Its risk:</strong> {variant.costHonestly}
          </p>
          <button
            type="button"
            className="variant-open"
            onClick={() => {
              setOpen(variant.id);
            }}
          >
            Open {variant.letter}
          </button>
        </section>
      ))}

      <section className="panel" aria-labelledby="rules">
        <h2 id="rules">What all three hold to</h2>
        <ul>
          <li>
            One best move, one question, or deliberate silence — never a list to choose from.
          </li>
          <li>Facts and inferences labelled in words, not by colour alone.</li>
          <li>Benefits and costs shown together, never netted into one number.</li>
          <li>No overall Life Score and no category score numbers.</li>
          <li>No streak grid, no AI imagery, no “all systems operational” panel.</li>
          <li>Five destinations at most, 44px targets, no sideways scrolling.</li>
        </ul>
      </section>
    </>
  );
}

// src/pages/NitroVsTurbo.tsx
// Blueprint demo: React Native native-bridge architecture, side by side.
// TurboModule / JSI (verbose, hand-written C++ glue + runtime lookups)
//   vs Nitro Modules (clean C++ HybridObjects + statically generated bindings).
// Focused on a mock animation-metadata reader (a la Rive's ".riv" probe).
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu, Zap, Layers3, Boxes, ArrowRight, Gauge, ScrollText,
  Wrench, Wand2, TerminalSquare, CheckCircle2, XCircle,
} from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'

/* ------------------------------------------------------------------ */
/*  Tiny, dependency-free syntax highlighter (caveman-simple).        */
/* ------------------------------------------------------------------ */
const KEYWORDS = new Set([
  'import', 'export', 'from', 'interface', 'extends', 'type', 'default',
  'class', 'public', 'private', 'override', 'return', 'const', 'auto',
  'void', 'throw', 'using', 'namespace', 'if', 'else', 'for', 'new',
  'struct', 'template', 'typename', 'nullptr', 'this', 'std', 'true', 'false',
])
const TOKEN = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b[A-Za-z_]\w*\b)|(\b\d+(?:\.\d+)?\b)/g

function Line({ text }: { text: string }) {
  const trimmed = text.trimStart()
  // Preprocessor directives (#include, #pragma) get their own colour.
  if (trimmed.startsWith('#'))
    return <span className="text-fuchsia-400">{text}</span>

  // Split off a trailing line-comment (our snippets never put // inside strings).
  const c = text.indexOf('//')
  const code = c === -1 ? text : text.slice(0, c)
  const comment = c === -1 ? null : text.slice(c)

  const out: React.ReactNode[] = []
  let last = 0, m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    if (m[1]) out.push(<span key={m.index} className="text-emerald-400">{m[1]}</span>)
    else if (m[2] && KEYWORDS.has(m[2])) out.push(<span key={m.index} className="text-indigo-400">{m[2]}</span>)
    else if (m[2] && /^[A-Z]/.test(m[2])) out.push(<span key={m.index} className="text-sky-300">{m[2]}</span>)
    else if (m[3]) out.push(<span key={m.index} className="text-amber-300">{m[3]}</span>)
    else out.push(m[0])
    last = m.index + m[0].length
  }
  if (last < code.length) out.push(code.slice(last))

  return (
    <span className="text-slate-300">
      {out}
      {comment && <span className="text-slate-500 italic">{comment}</span>}
    </span>
  )
}

function CodeBlock({ code }: { code: string }) {
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <pre className="overflow-x-auto text-[12.5px] leading-[1.55] font-mono p-4">
      <code>
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="select-none pr-4 text-right w-8 shrink-0 text-slate-700">{i + 1}</span>
            <span className="whitespace-pre">{l ? <Line text={l} /> : ' '}</span>
          </div>
        ))}
      </code>
    </pre>
  )
}

/* ------------------------------------------------------------------ */
/*  The mock domain: an animation-metadata reader.                    */
/* ------------------------------------------------------------------ */
type Layer = 'spec' | 'impl' | 'wiring'

const TABS: { id: Layer; label: string; icon: typeof Cpu }[] = [
  { id: 'spec',   label: 'TypeScript Spec', icon: ScrollText },
  { id: 'impl',   label: 'C++ Implementation', icon: Cpu },
  { id: 'wiring', label: 'Registration / Bindings', icon: Layers3 },
]

const TURBO: Record<Layer, string> = {
  spec: `// NativeAnimationReader.ts — TurboModule spec
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Return shape is a loose object — codegen can't nest it well,
  // so numbers are the safe common denominator.
  readMetadata(path: string): {
    durationMs: number;
    fps: number;
    frameCount: number;
    artboards: number;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('AnimationReader');`,

  impl: `// AnimationReaderModule.cpp — hand-written JSI glue
#include "AnimationReaderModule.h"
#include <jsi/jsi.h>
using namespace facebook;

// Every property access is a runtime string lookup on the module.
jsi::Value AnimationReaderModule::get(
    jsi::Runtime& rt, const jsi::PropNameID& name) {
  auto prop = name.utf8(rt);
  if (prop == "readMetadata") {
    // Allocate a fresh HostFunction on every lookup.
    return jsi::Function::createFromHostFunction(
      rt, name, 1,
      [](jsi::Runtime& rt, const jsi::Value&,
         const jsi::Value* args, size_t count) -> jsi::Value {
        // Manual arg validation + unboxing from jsi::Value.
        if (count < 1 || !args[0].isString())
          throw jsi::JSError(rt, "readMetadata: expected a path string");
        std::string path = args[0].asString(rt).utf8(rt);

        RiveMetadata meta = RiveFile::probe(path);

        // Build the JS object by hand, boxing each field one at a time.
        jsi::Object out(rt);
        out.setProperty(rt, "durationMs", jsi::Value((double)meta.durationMs));
        out.setProperty(rt, "fps",        jsi::Value((double)meta.fps));
        out.setProperty(rt, "frameCount", jsi::Value((double)meta.frameCount));
        out.setProperty(rt, "artboards",  jsi::Value((double)meta.artboards));
        return out;
      });
  }
  return jsi::Value::undefined();
}`,

  wiring: `// AnimationReaderPackage.cpp — per-module boilerplate you maintain.
#include "AnimationReaderModule.h"

std::shared_ptr<TurboModule> AnimationReaderPackage::getModule(
    const std::string& name,
    const JavaTurboModule::InitParams& params) {
  // A string switch you extend for every module + platform.
  if (name == "AnimationReader")
    return std::make_shared<AnimationReaderModule>(params);
  return nullptr;
}

// ...plus a .h header, a spec .js, CMake wiring, and matching
// Objective-C++ glue on iOS. Each type change is edited in 4 places.`,
}

const NITRO: Record<Layer, string> = {
  spec: `// AnimationReader.nitro.ts — one spec, nitrogen does the rest
import type { HybridObject } from 'react-native-nitro-modules';

// A real, nested, typed struct — generated into C++ / Swift / Kotlin.
export interface AnimationMetadata {
  durationMs: number;
  fps: number;
  frameCount: number;
  artboards: number;
}

export interface AnimationReader
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  readMetadata(path: string): AnimationMetadata;
}`,

  impl: `// HybridAnimationReader.hpp — you only write the logic.
#include "HybridAnimationReaderSpec.hpp"   // generated base class
#include "AnimationMetadata.hpp"           // generated struct
#include "RiveFile.hpp"

namespace margelo::nitro::anim {

class HybridAnimationReader : public HybridAnimationReaderSpec {
public:
  HybridAnimationReader() : HybridObject(TAG) {}

  // No jsi::Runtime. No manual boxing. Native types in, struct out.
  // The generated bindings marshal across the boundary once, statically.
  AnimationMetadata readMetadata(const std::string& path) override {
    RiveMetadata m = RiveFile::probe(path);
    return AnimationMetadata {
      .durationMs = m.durationMs,
      .fps        = m.fps,
      .frameCount = m.frameCount,
      .artboards  = m.artboards,
    };
  }
};

} // namespace margelo::nitro::anim`,

  wiring: `// HybridAnimationReader.cpp — registration is a single call.
#include "HybridAnimationReader.hpp"
#include <NitroModules/HybridObjectRegistry.hpp>

// nitrogen already generated the JSI bindings at build time.
// You just tell the registry how to construct your object.
HybridObjectRegistry::registerHybridObjectConstructor(
  "AnimationReader",
  []() -> std::shared_ptr<HybridObject> {
    return std::make_shared<HybridAnimationReader>();
  });`,
}

/* ------------------------------------------------------------------ */
/*  Why it's faster — the mechanical reasons.                         */
/* ------------------------------------------------------------------ */
const REASONS = [
  {
    icon: Gauge,
    title: 'Static dispatch, not string lookups',
    body: 'TurboModule resolves every call through get(rt, name) and an utf8 string compare. Nitro binds methods statically at build time — the runtime jumps straight to the C++ function.',
  },
  {
    icon: Boxes,
    title: 'No per-argument jsi::Value boxing',
    body: 'The JSI path unboxes each arg and boxes each result field by hand. Nitrogen-generated bindings marshal native types directly, converting the whole struct in one pass.',
  },
  {
    icon: Wand2,
    title: 'No HostFunction allocation per access',
    body: 'createFromHostFunction allocates a closure on every property lookup. A HybridObject exposes its methods once — repeated calls cost nothing extra.',
  },
  {
    icon: Wrench,
    title: 'One source of truth for types',
    body: 'A nested TS interface generates matching C++/Swift/Kotlin structs. In the TurboModule world the same shape is hand-mirrored across header, spec and glue.',
  },
]

const COMPARE = [
  ['Type definitions', 'Hand-mirrored in 3–4 files', 'Generated from one .nitro.ts'],
  ['Method dispatch', 'Runtime string lookup', 'Static, compile-time bound'],
  ['Argument marshalling', 'Manual jsi::Value boxing', 'Autogenerated, zero-copy where possible'],
  ['Nested / complex types', 'Awkward, flattened', 'First-class structs'],
  ['Boilerplate per module', 'High (package + glue + header)', 'Minimal (spec + impl)'],
] as const

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export function NitroVsTurbo() {
  const [tab, setTab] = useState<Layer>('impl')
  const speedup = useCountUp(94, 1600)
  const turboOps = useCountUp(1180, 1600)
  const nitroOps = useCountUp(110920, 1800)

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-text-secondary mb-5">
            <TerminalSquare size={13} className="text-accent" />
            React Native · Native Bridge Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Nitro Modules <span className="text-text-secondary font-normal">vs</span> TurboModule
          </h1>
          <p className="mt-3 text-text-secondary max-w-2xl">
            A side-by-side blueprint of the old JSI glue code versus the modern
            HybridObject approach — built around a mock animation-metadata reader
            that probes a <code className="text-sky-300">.riv</code> file.
          </p>
        </motion.div>

        {/* Benchmark strip */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-accent/30 bg-card p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 text-accent text-xs font-medium mb-2">
              <Zap size={14} /> HEADLINE SPEEDUP
            </div>
            <div className="text-4xl font-bold">{speedup}×</div>
            <div className="text-xs text-text-secondary mt-1">faster metadata reads (Rive-style workload)</div>
          </div>
          <BenchBar label="TurboModule / JSI" ops={turboOps} tone="danger" />
          <BenchBar label="Nitro HybridObject" ops={nitroOps} tone="success" />
        </div>

        {/* Comparison bars visual */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-text-secondary mb-3">Relative throughput — reads/sec, log-free view</div>
          <SpeedRow label="TurboModule" width={1} tone="bg-danger" value="1×" />
          <SpeedRow label="Nitro Modules" width={100} tone="bg-success" value="94×" />
        </div>

        {/* Side-by-side code */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5 p-1 rounded-lg border border-border bg-card">
              {TABS.map(t => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      active ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={13} /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <CodePane
              tone="danger"
              badge="Legacy"
              title="TurboModule + JSI"
              subtitle="Manual C++ glue · runtime lookups"
              code={TURBO[tab]}
            />
            <CodePane
              tone="success"
              badge="Modern"
              title="Nitro Modules"
              subtitle="HybridObject · generated bindings"
              code={NITRO[tab]}
            />
          </div>
        </div>

        {/* Why faster */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Cpu size={18} className="text-accent" /> Why the HybridObject wins
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {REASONS.map(r => {
              const Icon = r.icon
              return (
                <div key={r.title} className="rounded-xl border border-border bg-card p-5 card-glow transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                      <Icon size={16} className="text-accent" />
                    </div>
                    <h3 className="font-medium text-sm">{r.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{r.body}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Comparison table */}
        <div className="mt-12 rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-medium bg-bg/50 border-b border-border">
            <div className="p-3 text-text-secondary">Dimension</div>
            <div className="p-3 text-danger flex items-center gap-1.5"><XCircle size={13} /> TurboModule</div>
            <div className="p-3 text-success flex items-center gap-1.5"><CheckCircle2 size={13} /> Nitro</div>
          </div>
          {COMPARE.map(([dim, a, b], i) => (
            <div key={dim} className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-bg/30' : ''}`}>
              <div className="p-3 font-medium">{dim}</div>
              <div className="p-3 text-text-secondary">{a}</div>
              <div className="p-3 text-text-secondary">{b}</div>
            </div>
          ))}
        </div>

        {/* Data flow footer */}
        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <div className="text-xs text-text-secondary mb-4">The call path for <code className="text-sky-300">readMetadata('hero.riv')</code></div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Flow>JS call</Flow><ArrowRight size={14} className="text-text-secondary" />
            <Flow tone="danger">get(rt, "readMetadata")</Flow><ArrowRight size={14} className="text-text-secondary" />
            <Flow tone="danger">alloc HostFunction</Flow><ArrowRight size={14} className="text-text-secondary" />
            <Flow tone="danger">unbox / rebox each field</Flow>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
            <Flow>JS call</Flow><ArrowRight size={14} className="text-text-secondary" />
            <Flow tone="success">generated binding</Flow><ArrowRight size={14} className="text-text-secondary" />
            <Flow tone="success">C++ readMetadata()</Flow>
          </div>
          <p className="mt-5 text-xs text-text-secondary">
            Same result, far fewer hops. The Nitro path skips the runtime lookup,
            the per-call allocation, and the hand-written field marshalling —
            which is where the ~94× headline comes from.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small presentational bits.                                        */
/* ------------------------------------------------------------------ */
function CodePane({ tone, badge, title, subtitle, code }: {
  tone: 'danger' | 'success'; badge: string; title: string; subtitle: string; code: string
}) {
  const ring = tone === 'danger' ? 'border-danger/30' : 'border-success/30'
  const chip = tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'
  return (
    <div className={`rounded-xl border ${ring} bg-[#0d0d14] overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${chip}`}>{badge}</span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">{subtitle}</div>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
        </div>
      </div>
      <CodeBlock code={code} />
    </div>
  )
}

function BenchBar({ label, ops, tone }: { label: string; ops: number; tone: 'danger' | 'success' }) {
  const color = tone === 'danger' ? 'text-danger' : 'text-success'
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`text-xs font-medium mb-2 ${color}`}>{label}</div>
      <div className="text-2xl font-bold tabular-nums">{ops.toLocaleString()}</div>
      <div className="text-xs text-text-secondary mt-1">reads / sec (mock)</div>
    </div>
  )
}

function SpeedRow({ label, width, tone, value }: { label: string; width: number; tone: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 text-xs text-text-secondary shrink-0">{label}</div>
      <div className="flex-1 h-6 rounded bg-bg/60 overflow-hidden">
        <motion.div
          className={`h-full ${tone} rounded`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
      <div className="w-10 text-xs font-semibold text-right tabular-nums">{value}</div>
    </div>
  )
}

function Flow({ children, tone }: { children: React.ReactNode; tone?: 'danger' | 'success' }) {
  const cls =
    tone === 'danger' ? 'border-danger/30 text-danger bg-danger/10'
    : tone === 'success' ? 'border-success/30 text-success bg-success/10'
    : 'border-border text-text-secondary bg-bg/40'
  return <span className={`px-2.5 py-1 rounded-md border ${cls} font-mono`}>{children}</span>
}

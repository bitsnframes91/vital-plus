import type { TermsCopy } from "@/lib/terms";

/** Renders the full app terms (AGB) for one language: date, tagline, numbered
 *  sections with sub-headings and bullet lists, and the closing lines. */
export function TermsDocument({ copy }: { copy: TermsCopy }) {
  return <article className="space-y-5 break-words text-sm leading-6">
    <p className="text-xs text-muted-foreground">{copy.date}</p>
    <p className="font-semibold text-foreground">{copy.tagline}</p>
    {copy.sections.map(section => <section key={section.title} className="space-y-3">
      <h2 className="mb-2 font-semibold text-foreground">{section.title}</h2>
      {section.blocks.map((block, index) => <div key={index} className="space-y-2">
        {block.h && <h3 className="font-semibold text-foreground">{block.h}</h3>}
        {block.p && <p className="whitespace-pre-line text-muted-foreground">{block.p}</p>}
        {block.list && <ul className="ml-4 list-disc space-y-1 text-muted-foreground">{block.list.map(item => <li key={item}>{item}</li>)}</ul>}
        {block.items && <ul className="ml-4 list-disc space-y-1 text-muted-foreground">{block.items.map(item => <li key={item.label}><span className="font-semibold text-foreground">{item.label}:</span> {item.text}</li>)}</ul>}
      </div>)}
    </section>)}
    <div className="space-y-2 border-t border-border pt-4">
      {copy.closing.map((line, index) => <p key={index} className={index === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}>{line}</p>)}
    </div>
  </article>;
}

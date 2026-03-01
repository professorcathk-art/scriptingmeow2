"use client";

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    handle: "@sarahcreates",
    avatar: "SC",
    content: "designermeow cut my content creation time by 80%. The AI actually gets my brand voice.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    handle: "@marcusdesign",
    avatar: "MR",
    content: "Finally, an AI tool that doesn't produce generic content. Every post feels like me.",
    rating: 5,
  },
  {
    name: "Emma Kim",
    handle: "@emmakimstudio",
    avatar: "EK",
    content: "I run 5 brands. This keeps everything consistent without the mental load. Game changer.",
    rating: 5,
  },
  {
    name: "Jake Thompson",
    handle: "@jakethompson",
    avatar: "JT",
    content: "The brandbook feature is genius. Once you set it up, you can forget about it.",
    rating: 5,
  },
  {
    name: "Luna Park",
    handle: "@lunapark",
    avatar: "LP",
    content: "From idea to polished post in under 2 minutes. My clients think I have a team.",
    rating: 5,
  },
];

function StarIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function LandingTestimonials() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
          Wall of Love
        </h2>
        <p className="text-zinc-400 text-lg">
          What creators and brands are saying
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-200">
                {t.avatar}
              </div>
              <div>
                <p className="font-medium text-zinc-100">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.handle}</p>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, j) => (
                <StarIcon key={j} />
              ))}
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              &quot;{t.content}&quot;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

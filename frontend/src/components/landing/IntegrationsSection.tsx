const NAMES = [
  "Slack",
  "Notion",
  "Salesforce",
  "Zendesk",
  "HubSpot",
  "Shopify",
  "Zapier",
  "Microsoft Teams",
];

export default function IntegrationsSection() {
  return (
    <section className="border-navy-100 border-y bg-navy-50/70 py-20 dark:border-navy-800/60 dark:bg-navy-900/40">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.6em] text-gold-600 dark:text-gold-500">
          Integraciones
        </p>
        <h3 className="mb-10 text-base font-semibold tracking-widest text-navy-500 uppercase dark:text-slate-400">
          Se integra con tu ecosistema
        </h3>
        <div className="grid grid-cols-2 items-center gap-8 opacity-75 transition-opacity duration-500 hover:opacity-100 md:grid-cols-4 md:gap-12">
          {NAMES.map((name) => (
            <div key={name} className="flex items-center justify-center">
              <span className="cursor-default text-2xl font-bold text-navy-400 transition-colors hover:text-navy-700 md:text-3xl dark:text-navy-300 dark:hover:text-gold-400">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

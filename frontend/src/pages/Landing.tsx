import React, { useRef, useCallback } from "react";
import MainNavbar from "@/components/landing/MainNavbar";
import HeroSection from "@/components/landing/HeroSection";
import DemoSection from "@/components/landing/DemoSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import PricingSection from "@/components/landing/PricingSection";
import CallToAction from "@/components/landing/CallToAction";
import LandingFooter from "@/components/landing/LandingFooter";
import { BackToTop } from "@/components/ui/BackToTop";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { smoothScrollTo } from "@/utils/smoothScroll";

const SECTION_IDS = ["hero", "demo", "casos-uso", "precios", "contacto"];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const setRevealRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    ref.current.classList.add("is-visible");
    const HEADER_H = 64;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - HEADER_H;
    smoothScrollTo(top);
  }, []);

  return (
    <div className="relative min-h-screen [overflow-x:clip] bg-white text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      {/* Light mode ambient glows — brand-tinted */}
      <div className="pointer-events-none fixed inset-0 -z-10 dark:hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-navy-100/60 blur-[120px] opacity-70" />
        <div className="absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-gold-100/70 blur-[120px] opacity-60" />
        <div className="absolute bottom-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-navy-50/80 blur-[100px] opacity-50" />
      </div>
      {/* Dark mode ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 hidden dark:block" aria-hidden="true">
        <div className="absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-navy-800/40 blur-[100px]" />
        <div className="absolute top-1/2 -right-10 h-[350px] w-[350px] rounded-full bg-gold-900/20 blur-[100px]" />
      </div>

      <MainNavbar
        scrollToHero={() => scrollTo(heroRef)}
        scrollToDemo={() => scrollTo(demoRef)}
        scrollToHowItWorks={() => scrollTo(howRef)}
        scrollToPricing={() => scrollTo(pricingRef)}
        scrollToCta={() => scrollTo(ctaRef)}
        sectionIds={SECTION_IDS}
      />

      <main id="main-content">
        <div ref={heroRef} id="hero" className="reveal-section reveal-section--instant">
          <HeroSection />
        </div>

        <div
          ref={(el) => {
            (demoRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setRevealRef(0)(el);
          }}
          className="reveal-section"
          style={{ scrollMarginTop: "4rem" }}
        >
          <DemoSection />
        </div>

        <div
          ref={(el) => {
            (howRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setRevealRef(1)(el);
          }}
          className="reveal-section"
          style={{ scrollMarginTop: "4rem" }}
        >
          <HowItWorksSection />
        </div>

        <div
          ref={(el) => {
            setRevealRef(2)(el);
          }}
          className="reveal-section"
          style={{ scrollMarginTop: "4rem" }}
        >
          <IntegrationsSection />
        </div>

        <div
          ref={(el) => {
            (pricingRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setRevealRef(3)(el);
          }}
          id="precios"
          className="reveal-section"
          style={{ scrollMarginTop: "4rem" }}
        >
          <PricingSection />
        </div>

        <div
          ref={(el) => {
            (ctaRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setRevealRef(4)(el);
          }}
          id="contacto"
          className="reveal-section"
          style={{ scrollMarginTop: "4rem" }}
        >
          <CallToAction />
        </div>
      </main>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}

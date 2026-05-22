import { useState } from 'react';
import { motion } from 'framer-motion';
import CinematicIntro from '../components/CinematicIntro';
import Navbar from '../components/home/Navbar';
import HeroSection from '../components/home/HeroSection';
import FacilityRentals from '../components/home/FacilityRentals';

import AboutSection from '../components/home/AboutSection';
import ValuesMarquee from '../components/home/ValuesMarquee';
import RestaurantTeaser from '../components/home/RestaurantTeaser';
import MembershipPlans from '../components/home/MembershipPlans';
import Testimonials from '../components/home/Testimonials';
import PortalCTA from '../components/home/PortalCTA';
import MotivationalBanner from '../components/home/MotivationalBanner';
import ContactSection from '../components/home/ContactSection';
import Footer from '../components/home/Footer';
import ScrollToTop from '../components/home/ScrollToTop';
import WhatsAppFloat from '../components/home/WhatsAppFloat';

function FlowSection({ children, theme = 'dark', id }) {
  return (
    <motion.div
      id={id}
      data-theme={theme}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  // Always display landing animation on home page load for maximum visual wow factor
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const replayLandingAnimation = () => {
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Cinematic Landing Animation (plays once per session) */}
      {showIntro && (
        <CinematicIntro onComplete={handleIntroComplete} />
      )}

      {/* Main Homepage Content — fades in after intro */}
      {!showIntro && <Navbar />}
      <motion.div
        initial={showIntro ? { opacity: 0, filter: 'blur(20px)', scale: 1.04 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: showIntro ? 0.15 : 0 }}
      >
        <HeroSection />
        <FlowSection id="section-sports">
          <FacilityRentals />
        </FlowSection>

        <div id="section-about" data-theme="light">
          <AboutSection />
        </div>
        <ValuesMarquee />
        <FlowSection id="section-restaurant">
          <RestaurantTeaser />
        </FlowSection>
        <FlowSection id="section-membership" theme="light">
          <MembershipPlans />
        </FlowSection>
        <Testimonials />
        <div id="section-portal" data-theme="light">
          <PortalCTA />
        </div>
        <MotivationalBanner />
        <ContactSection />
        <Footer />
        <ScrollToTop />
        <WhatsAppFloat />

        {/* Floating manual trigger to let users/reviewers replay the cinematic landing animation on-demand */}
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={replayLandingAnimation}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/80 hover:bg-[#C8102E] backdrop-blur-md text-white border border-white/10 shadow-2xl transition-all duration-300 hover:scale-105 group cursor-pointer font-body text-xs font-bold uppercase tracking-wider"
            title="Replay Cinematic Landing Animation"
          >
            <span className="text-base">🎬</span>
            <span className="hidden sm:inline">Replay Intro</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

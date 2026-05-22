import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'About Us', href: '#about' },
  { label: 'Our Sports', href: '#sports', hasDropdown: true },
  { label: 'Restaurant', href: '/table-portal' },
  { label: 'Contact', href: '#contact' },
];

const dropdownSports = [
  { label: 'Cricket', href: '/sports/cricket', color: '#C8102E' },
  { label: 'Swimming', href: '/sports/swimming', color: '#0EA5E9' },
  { label: 'Badminton', href: '/sports/badminton', color: '#8B5CF6' },
  { label: 'Gym', href: '/sports/gym', color: '#F59E0B' },
  { label: 'Table Tennis', href: '/sports/table-tennis', color: '#F97316' },
  { label: 'Pickleball', href: '/sports/pickleball', color: '#A855F7' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);

    // Intersection Observer to detect light sections
    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingLight = entries.some(entry => entry.isIntersecting);
        setIsLightSection(intersectingLight);
      },
      {
        rootMargin: '-80px 0px -90% 0px', // Check top 80px (navbar height)
        threshold: 0
      }
    );

    const lightSections = document.querySelectorAll('[data-theme="light"]');
    lightSections.forEach(section => observer.observe(section));

    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const textColor = isLightSection ? 'text-[#0D0D0D]' : 'text-white';
  const logoColor = isLightSection ? 'text-[#0D0D0D]' : 'text-white';
  const hamburgerColor = isLightSection ? 'bg-[#0D0D0D]' : 'bg-white';

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-[400ms] ease-in-out"
        style={{
          backgroundColor: scrolled 
            ? (isLightSection ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.1)') 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          boxShadow: scrolled ? '0 8px 32px rgba(0, 0, 0, 0.15)' : 'none',
        }}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-4 md:px-8 lg:px-12 py-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#C8102E] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#FFFFFF" opacity="0.2"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" stroke="#FFF" strokeWidth="1.5"/>
                <path d="M8 6c2 3 2 9 0 12M16 6c-2 3-2 9 0 12" stroke="#FFF" strokeWidth="1.2" fill="none"/>
              </svg>
            </div>
            <span
              className={`${logoColor} text-lg tracking-[2px] uppercase hidden sm:block transition-colors duration-300`}
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Red Ball Cricket Academy
            </span>
          </Link>

          {/* Center Nav Links — Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.hasDropdown && setDropdownOpen(true)}
                onMouseLeave={() => link.hasDropdown && setDropdownOpen(false)}
              >
                {link.href.startsWith('/') ? (
                  <Link
                    to={link.href}
                    className={`nav-link px-4 py-2 ${textColor} text-[15px] font-medium flex items-center gap-1 transition-colors hover:text-[#C8102E]`}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className={`nav-link px-4 py-2 ${textColor} text-[15px] font-medium flex items-center gap-1 transition-colors hover:text-[#C8102E]`}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                  >
                    {link.label}
                    {link.hasDropdown && (
                      <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </a>
                )}

                {/* Dropdown */}
                {link.hasDropdown && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50"
                    style={{
                      opacity: dropdownOpen ? 1 : 0,
                      transform: dropdownOpen ? 'translateY(0)' : 'translateY(-8px)',
                      pointerEvents: dropdownOpen ? 'auto' : 'none',
                      transition: 'opacity 200ms ease, transform 200ms ease',
                    }}
                  >
                    <div className="w-[420px] bg-[#1A1A1A] border border-white/10 rounded-xl p-6 shadow-2xl">
                      <p className="text-xs uppercase tracking-[3px] text-[#F5A623] font-semibold mb-4 text-center"
                         style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Select a Sport
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {dropdownSports.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-[#C8102E]/10 hover:border-l-2 hover:border-l-[#C8102E] group"
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-white/80 group-hover:text-white transition-colors font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {item.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className={`hidden md:inline-flex px-5 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                  isLightSection 
                    ? 'border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E] hover:text-white' 
                    : 'border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623] hover:text-black'
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Log out
              </button>
            ) : (
              <Link
                to="/login"
                className={`hidden md:inline-flex px-5 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                  isLightSection 
                    ? 'border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E] hover:text-white' 
                    : 'border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623] hover:text-black'
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Login
              </Link>
            )}
            <Link
              to={isAuthenticated ? '/user/book-slots' : '/book-slots'}
              className="hidden md:inline-flex px-6 py-2.5 rounded-full bg-[#C8102E] text-white text-sm font-semibold transition-all duration-200 hover:bg-[#8B0B1E] hover:shadow-[0_0_16px_rgba(200,16,46,0.5)] hover:scale-[1.03]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Book Now
            </Link>

            {/* Hamburger — Mobile */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`lg:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px] ${drawerOpen ? 'hamburger-open' : ''}`}
              aria-label="Toggle menu"
            >
              <span className={`hamburger-line block w-6 h-[2px] ${hamburgerColor} rounded-full origin-center transition-all duration-300`} />
              <span className={`hamburger-line block w-6 h-[2px] ${hamburgerColor} rounded-full origin-center transition-all duration-300`} />
              <span className={`hamburger-line block w-6 h-[2px] ${hamburgerColor} rounded-full origin-center transition-all duration-300`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[80vw] max-w-[400px] bg-[#0D0D0D] z-[70] lg:hidden flex flex-col transition-transform duration-[350ms]"
        style={{
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Close button */}
        <div className="flex justify-end p-5">
          <button onClick={() => setDrawerOpen(false)} className="text-white p-2" aria-label="Close menu">
            <X size={24} />
          </button>
        </div>

        {/* Cricket ball watermark */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-[0.04] pointer-events-none">
          <svg width="280" height="280" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="white" />
            <path d="M30 15c8 14 8 56 0 70M70 15c-8 14-8 56 0 70" stroke="white" strokeWidth="3" fill="none" opacity="0.5"/>
          </svg>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col px-6 pt-4 gap-1">
          {navLinks.map((link, i) => (
            link.href.startsWith('/') ? (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setDrawerOpen(false)}
                className="text-white text-xl py-3 border-b border-white/5 transition-all duration-250"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: '2px',
                  animationDelay: drawerOpen ? `${i * 60}ms` : '0ms',
                  opacity: drawerOpen ? 1 : 0,
                  transform: drawerOpen ? 'translateX(0)' : 'translateX(24px)',
                  transition: `opacity 250ms ease ${i * 60}ms, transform 250ms ease ${i * 60}ms`,
                }}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="text-white text-xl py-3 border-b border-white/5 transition-all duration-250"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: '2px',
                  animationDelay: drawerOpen ? `${i * 60}ms` : '0ms',
                  opacity: drawerOpen ? 1 : 0,
                  transform: drawerOpen ? 'translateX(0)' : 'translateX(24px)',
                  transition: `opacity 250ms ease ${i * 60}ms, transform 250ms ease ${i * 60}ms`,
                }}
              >
                {link.label}
              </a>
            )
          ))}
        </nav>

        {/* Drawer CTAs */}
        <div className="p-6 space-y-3">
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                setDrawerOpen(false);
              }}
              className="block w-full text-center py-3 rounded-full border-2 border-[#F5A623] text-[#F5A623] font-medium transition-all hover:bg-[#F5A623] hover:text-black"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setDrawerOpen(false)}
              className="block text-center py-3 rounded-full border-2 border-[#F5A623] text-[#F5A623] font-medium transition-all hover:bg-[#F5A623] hover:text-black"
            >
              Login
            </Link>
          )}
          <Link
            to={isAuthenticated ? '/user/book-slots' : '/book-slots'}
            onClick={() => setDrawerOpen(false)}
            className="block text-center py-3 rounded-full bg-[#C8102E] text-white font-semibold transition-all hover:bg-[#8B0B1E]"
          >
            Book Now
          </Link>
        </div>
      </div>
    </>
  );
}

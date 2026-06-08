"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

const FloatingCTA = () => {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Masqué sur la page contact
  if (pathname === "/contact") return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`fixed z-40 ${
            isMobile ? "bottom-0 left-0 right-0 p-3 btn-cta" : "bottom-6 right-6"
          }`}
        >
          <Link href="/contact" className={isMobile ? "block" : ""}>
            <button
              className={`flex items-center gap-2 font-semibold transition-all duration-300 ${
                isMobile
                  ? "w-full justify-center h-14 text-base text-white"
                  : "h-14 px-6 btn-cta rounded-xl hover:scale-[1.02]"
              }`}
            >
              <Phone className="w-5 h-5" />
              <span className="flex flex-col items-start leading-tight">
                <span>Prendre RDV gratuit 45 min</span>
                <span className="text-xs opacity-80 font-normal">Sans engagement</span>
              </span>
            </button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCTA;

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

export default function Splash() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-midnight via-slate to-navy overflow-hidden"
        >
          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: Math.random() * 1000, 
                  x: Math.random() * 1000,
                  opacity: 0.3 
                }}
                animate={{ 
                  y: [0, -200, 0],
                  x: [0, 100, 0],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 5 + Math.random() * 5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute w-1 h-1 bg-gold rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="w-[350px] sm:w-[500px] relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 1, 1, 0] }}
              transition={{ duration: 5, ease: "easeInOut" }}
              className="w-full relative shadow-2xl rounded-lg"
            >
              {/* Cover */}
              <div className="rounded-lg flex flex-col items-center justify-center p-16 sm:p-24 bg-gradient-to-br from-gold via-gold-bright to-gold border-[5px] border-[#8B7355] aspect-[3/4]">
                <div className="absolute inset-5 border-2 border-[#8B7355]/40 rounded-sm" />
                <div className="absolute inset-7 border border-[#8B7355]/30 rounded-sm" />
                
                <h1 className="font-urdu text-5xl sm:text-7xl text-midnight text-center mb-6 relative z-10 drop-shadow-xl font-bold pt-6 pb-2">
                  کتابوں کی دولت
                </h1>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-[1px] w-8 bg-midnight/40" />
                  <p className="text-sm sm:text-base text-midnight font-bold tracking-[6px] uppercase drop-shadow-sm text-center">
                    Kitabon Ki Dolat
                  </p>
                  <div className="h-[1px] w-8 bg-midnight/40" />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 1, 0], y: 0 }}
            transition={{ duration: 5 }}
            className="absolute bottom-[100px] flex flex-col items-center gap-6"
          >
            <div className="font-urdu text-2xl sm:text-3xl text-gold">
              اصلی دولت کتابوں میں ہے
            </div>
            <div className="text-sm text-gold/60 tracking-[4px] uppercase animate-pulse">
              Loading Experience...
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

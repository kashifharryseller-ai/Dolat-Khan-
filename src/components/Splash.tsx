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

          <div className="perspective-[2000px] w-[350px] h-[450px] sm:w-[500px] sm:h-[600px] relative preserve-3d">
            <motion.div
              initial={{ rotateY: 0, scale: 0.8 }}
              animate={{ 
                rotateY: [0, 0, -5, -180, -180, -180],
                scale: [0.8, 1, 1.05, 1.2, 1.5, 2],
                z: [0, 0, 0, 50, 100, 150],
                opacity: [1, 1, 1, 1, 1, 0]
              }}
              transition={{ duration: 5, ease: [0.68, -0.55, 0.265, 1.55] }}
              className="w-full h-full relative preserve-3d"
            >
              {/* Spine */}
              <div 
                className="absolute left-0 top-0 w-[40px] h-full bg-gradient-to-r from-[#8B7355] via-[#6B5845] to-[#4B3825] -rotate-y-90 -translate-z-5 shadow-inner"
              />
              
              {/* Cover */}
              <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-center backface-hidden bg-gradient-to-br from-gold via-gold-bright to-gold border-[5px] border-[#8B7355] shadow-2xl">
                <div className="absolute inset-5 border-2 border-[#8B7355]/40 rounded-sm" />
                <div className="absolute inset-7 border border-[#8B7355]/30 rounded-sm" />
                
                <h1 className="font-urdu text-4xl sm:text-6xl text-midnight text-center mb-4 relative z-10 drop-shadow-md">
                  کتابوں کی دولت
                </h1>
                <p className="text-lg sm:text-xl text-slate font-bold tracking-[4px] relative z-10 uppercase">
                  Kitabon Ki Dolat
                </p>
              </div>
              
              {/* Pages */}
              <div className="absolute inset-[1%] bg-cream rotate-y-180 -translate-z-2 rounded-lg p-8 sm:p-12 flex flex-col justify-center shadow-inner">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5, duration: 1 }}
                  className="font-serif text-2xl sm:text-3xl text-midnight text-center italic leading-relaxed"
                >
                  "True wealth lies not in gold,<br/>but in the pages of books..."
                </motion.p>
              </div>

              {/* Page Turn Effect */}
              <motion.div 
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -180 }}
                transition={{ delay: 1, duration: 3, ease: "easeInOut" }}
                className="absolute w-1/2 h-full right-0 top-0 bg-gradient-to-r from-cream/90 to-cream origin-left shadow-2xl"
              />
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5 }}
            className="absolute bottom-[150px] font-urdu text-2xl sm:text-3xl text-gold"
          >
            اصلی دولت کتابوں میں ہے
          </motion.div>
          
          <div className="absolute bottom-[80px] text-lg text-gold tracking-widest animate-pulse">
            Opening your library...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

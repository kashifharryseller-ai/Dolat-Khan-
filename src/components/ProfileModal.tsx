import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, BookOpen, Star, Clock, Shield, Settings, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onLogout }: ProfileModalProps) {
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      const fetchUserData = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-midnight/90 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate border border-gold/20 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-gold/20 via-accent/20 to-midnight relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white bg-midnight/50 hover:bg-midnight/80 p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-8 pb-8">
            {/* Profile Info */}
            <div className="relative flex justify-between items-end -mt-12 mb-8">
              <div className="flex items-end gap-6">
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=D4AF37&color=141414`} 
                    alt={user.displayName || 'User'} 
                    className="w-24 h-24 rounded-2xl border-4 border-slate object-cover shadow-xl"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-gradient-to-br from-gold to-gold-bright text-midnight rounded-xl p-1.5 shadow-lg border-2 border-slate">
                    <Trophy className="w-5 h-5" />
                  </div>
                </div>
                <div className="pb-2">
                  <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
                  <p className="text-white/60 text-sm">{user.email}</p>
                </div>
              </div>
              
              <div className="pb-2 text-right">
                <div className="inline-flex items-center gap-1.5 bg-gold/10 border border-gold/20 px-3 py-1 rounded-full text-gold text-xs font-bold tracking-widest uppercase">
                  {userData?.role === 'admin' ? (
                    <><Shield className="w-3.5 h-3.5" /> Admin</>
                  ) : (
                    <><Star className="w-3.5 h-3.5" /> Level 12</>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-colors">
                <BookOpen className="w-6 h-6 text-gold mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold text-white mb-1">24</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Books Read</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-colors">
                <Clock className="w-6 h-6 text-accent mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold text-white mb-1">128h</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Listening Time</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-colors">
                <Trophy className="w-6 h-6 text-gold-bright mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold text-white mb-1">2450</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Total Points</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-xl transition-colors group">
                <div className="flex items-center gap-3 text-white/80 group-hover:text-white">
                  <Settings className="w-5 h-5 text-gold/70" />
                  <span className="font-medium">Account Settings</span>
                </div>
                <span className="text-white/40 text-sm">Manage details</span>
              </button>
              
              <button 
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-between bg-accent/10 hover:bg-accent/20 border border-accent/20 px-6 py-4 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 text-accent group-hover:text-accent-light">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

export const LogoutSuccess = ({ isVisible }: { isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center border border-slate-100"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 mb-6"
            >
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-slate-900"
            >
              Logged Out
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 font-medium mt-1"
            >
              See you again soon!
            </motion.p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

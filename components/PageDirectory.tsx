"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search, BarChart3, Shield, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pages = [
  {
    title: "Job Scanner",
    description: "Scan and analyze job postings for scams and red flags",
    icon: Search,
    href: "/filtr",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    title: "Analytics",
    description: "View your scanning history and insights",
    icon: BarChart3,
    href: "/dashboard",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Protected Jobs",
    description: "Browse verified and safe job opportunities",
    icon: Shield,
    href: "/protected",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "AI Insights",
    description: "Get personalized job market intelligence",
    icon: Sparkles,
    href: "/insights",
    gradient: "from-rose-500 to-orange-500",
  },
];

export function PageDirectory() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    },
  };

  return (
    <div className="relative py-16">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
              Explore Features
            </span>
          </h2>
          <p className="text-base md:text-lg text-white/50 font-light max-w-2xl mx-auto">
            Discover all the tools available to help you navigate the job market safely
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <motion.div key={page.href} variants={itemVariants}>
                <Link href={page.href}>
                  <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/30 transition-all duration-300 h-full cursor-pointer hover:scale-105">
                    <div className={`absolute inset-0 bg-gradient-to-br ${page.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <CardContent className="p-6 relative z-10">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${page.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-300 group-hover:to-purple-300 transition-all duration-300">
                        {page.title}
                      </h3>
                      <p className="text-white/60 text-sm font-light leading-relaxed">
                        {page.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

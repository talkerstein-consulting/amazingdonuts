"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "motion/react";

const creatingImages = [
  {
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop",
    aspectRatio: 2,
  },
  {
    url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=200&h=200&fit=crop",
    aspectRatio: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=350&h=200&fit=crop",
    aspectRatio: 1.75,
  },
  {
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop",
    aspectRatio: 1,
  },
];

const buildingImages = [
  {
    url: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=200&fit=crop",
    aspectRatio: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop",
    aspectRatio: 2,
  },
  {
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop",
    aspectRatio: 1,
  },
  {
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=350&h=200&fit=crop",
    aspectRatio: 1.75,
  },
];

interface ImageData {
  url: string;
  aspectRatio: number;
}

interface MediaBetweenTextRowProps {
  leftText: string;
  rightText: string;
  images: ImageData[];
  alt: string;
  isInView: boolean;
  delay?: number;
}

function MediaBetweenTextRow({
  leftText,
  rightText,
  images,
  alt,
  isInView,
  delay = 0,
}: MediaBetweenTextRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const shouldAnimate = isInView || isHovered;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const currentImage = images[currentImageIndex];
  const baseHeight = 100;
  const targetWidth = shouldAnimate ? baseHeight * currentImage.aspectRatio : 0;

  return (
    <>
      <motion.div
        className="sm:hidden text-2xl font-medium text-neutral-900 dark:text-white leading-tight uppercase tracking-tight text-left w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
      >
        {leftText} {rightText}
      </motion.div>

      <div
        className="hidden sm:flex items-center justify-center gap-x-4 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.span
          layout
          className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium text-neutral-900 dark:text-white leading-none uppercase tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay }}
        >
          {leftText}
        </motion.span>
        <motion.div
          layout
          className="h-[60px] md:h-[70px] lg:h-20 xl:h-[100px] overflow-hidden rounded-md"
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: targetWidth,
            opacity: shouldAnimate ? 1 : 0,
          }}
          transition={{
            width: { duration: 0.5, type: "spring", bounce: 0 },
            opacity: { duration: 0.3 },
          }}
        >
          <img
            src={currentImage.url}
            alt={alt}
            className="h-full w-full object-cover"
          />
        </motion.div>
        <motion.span
          layout
          className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium text-neutral-900 dark:text-white leading-none uppercase tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: delay + 0.1 }}
        >
          {rightText}
        </motion.span>
      </div>
    </>
  );
}

export function Hero8() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const shouldShowMedia = isInView || hasAnimated;

  return (
    <section className="w-full min-h-screen flex items-start lg:items-center py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div ref={sectionRef} className="max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col items-start sm:items-center space-y-8 sm:space-y-12 lg:space-y-16">
          <div className="flex flex-col items-start sm:items-center w-full space-y-2 sm:space-y-4">
            <MediaBetweenTextRow
              leftText="Creating"
              rightText="Digital"
              images={creatingImages}
              alt="Creating digital experiences"
              isInView={shouldShowMedia}
              delay={0}
            />
            <MediaBetweenTextRow
              leftText="Building"
              rightText="Tomorrow"
              images={buildingImages}
              alt="Building tomorrow"
              isInView={shouldShowMedia}
              delay={0.15}
            />
          </div>

          <motion.p
            className="text-left sm:text-center text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed w-full sm:max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            We craft exceptional digital products that connect brands with their
            audiences. From concept to launch, our team delivers innovative
            solutions.
          </motion.p>

          <motion.div
            className="w-full overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="w-full aspect-[16/9] sm:aspect-[21/9] bg-neutral-200 dark:bg-neutral-800">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&h=600&fit=crop"
                alt="Team collaboration"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero8;

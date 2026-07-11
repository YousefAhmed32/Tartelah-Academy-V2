import { motion } from 'framer-motion'
import { EASE_CINEMATIC } from './motion.constants.js'

export default function MaskReveal({
  as: Wrapper = 'span',
  children,
  delay = 0,
  duration = 0.7,
  reducedMotion = false,
  viewport = false,
  viewportMargin = '-60px',
  className,
  style,
}) {
  if (reducedMotion) {
    return (
      <Wrapper className={className} style={style}>
        {children}
      </Wrapper>
    )
  }

  const motionProps = viewport
    ? {
        whileInView: {
          opacity: 1,
          y: 0,
        },
        viewport: {
          once: true,
          amount: 0.2,
          margin: viewportMargin,
        },
      }
    : {
        animate: {
          opacity: 1,
          y: 0,
        },
      }

  return (
    <Wrapper
      className={className}
      style={{
        ...style,
        display: 'inline-block',
        overflow: 'hidden',
      }}
    >
      <motion.span
        style={{
          display: 'inline-block',
          willChange: 'transform, opacity',
        }}
        initial={{
          opacity: 0,
          y: 24,
        }}
        {...motionProps}
        transition={{
          duration,
          delay,
          ease: EASE_CINEMATIC,
        }}
      >
        {children}
      </motion.span>
    </Wrapper>
  )
}